/*	
	This file is part of JUCI (https://github.com/mkschreder/orange.git)

	Copyright (c) 2015-2016 Martin K. Schröder <mkschreder.uk@gmail.com>

	This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
*/ 

(function(scope){
	var RPC_DEFAULT_SESSION_ID = "00000000000000000000000000000000"; 
	
	var gettext = function(text){ return text; }; 

	function RPC(){
		this.requests = {}; 
		this.events = {}; 
		this.seq = parseInt(Math.random()*65535); 
		this.connected = false; 
		this.sid = ""; 
	}

	RPC.prototype.$connect = function(address){
		var socket = this.socket = new WebSocket(address); 	
		var self = this; 
		var def = $.Deferred(); 
		console.log("Starting websocket.."); 
		socket.onopen = function(){
			console.log("Websocket RPC connected!"); 
			self.connected = true; 
			def.resolve(); 
		} 
		socket.onerror = function(){
			console.log("Websocket error!"); 
			def.reject(); 
			/*setTimeout(function(){
				self.$connect(address); 
			}, 5000); */
		}
		socket.onclose = function(){
			self.connected = false; 	
			setTimeout(function(){
				self.$connect(address).done(function(){
					def.resolve(); 
				}); 
			}, 5000); 
		}
		socket.onmessage = function(e){
			self._onMessage(e.data); 
		} 
		return def.promise(); 
	}

	RPC.prototype._onConnected = function(){

	}

	RPC.prototype._onMessage = function(data){
		var obj = null; 
		var self = this; 
		try { obj = JSON.parse(data); } catch(e) { 
			console.log("RPC: could not parse data: "+e+": "+data); 
			return; 
		} 
		if(!obj.map) return; 
		console.log("RPC got data: "+data); 
		obj.map(function(msg){ 
			if(!msg.jsonrpc || msg.jsonrpc != "2.0") return; 
			if(msg.id && msg.result != undefined && self.requests[msg.id]){
				self.requests[msg.id].deferred.resolve(msg.result); 
			} else if(msg.id && msg.error != undefined && self.requests[msg.id]){
				self.requests[msg.id].deferred.reject(msg.error); 
			} else if(!msg.id && msg.method && msg.params && self.events[msg.method]){
				self.events[msg.method].map(function(f){
					f({
						type: msg.method, 
						data: msg.params
					}); 
				}); 
			}
		}); 
	}
	
	RPC.prototype.$request = function(method, params){
		var self = this; 
		self.seq++; 
		var req = self.requests[self.seq] = {
			id: self.seq,
			deferred: $.Deferred()
		}; 
		var str = JSON.stringify({
			jsonrpc: "2.0", 
			id: req.id, 
			method: method, 
			params: params || []
		})+"\n";  
		console.log("websocket > "+str); 
		self.socket.send(str); 
		return req.deferred.promise();  
	}

	RPC.prototype.$call = function(object, method, data){
		var self = this; 
		return this.$request("call", [this.sid, object, method, data]); 	
	}
	RPC.prototype.$subscribe = function(name, func){
		if(!this.events[name]) this.events[name] = []; 
		this.events[name].push(func); 
	}

	RPC.prototype.$getSessionId = function(){
		return this.sid; 	
	}
	RPC.prototype.$isConnected = function(){
		return this.connected; 
	}

	RPC.prototype.$login = function(username, password){
		var self = this; 
		var def = $.Deferred(); 
		var jsSHA = require("./sha"); 
		self.$request("challenge").done(function(resp){
			console.log("GOT CHALLENGE: "+JSON.stringify(resp)); 
			var sha = new jsSHA("SHA-1", "TEXT");
			var pwhash = new jsSHA("SHA-1", "TEXT"); 
			pwhash.update(username); 
			sha.update(resp.token); 
			sha.update(pwhash.getHash("HEX"));
			self.$request("login", [username, sha.getHash("HEX")]).done(function(resp){
				console.log("LOGIN RESULT: "+JSON.stringify(resp)); 
				if(resp.success) self.sid = resp.success; 
				def.resolve(resp.success); 
			}).fail(function(){
				def.reject(); 
			}); 
		}).fail(function(){
			def.reject();
		}); 
		return def.promise(); 
	}

	RPC.prototype.$list = function(){
		var self = this; 
		self.seq++; 
		var req = self.requests[self.seq] = {
			id: self.seq,
			deferred: $.Deferred()
		}; 
		var str = JSON.stringify({
			jsonrpc: "2.0", 
			id: req.id, 
			method: "list", 
			params: [self.sid, "*"]
		})+"\n"; 
		console.log("websocket > "+str); 
		self.socket.send(str); 
		return req.deferred.promise();  

	}
	
	scope.RPC = scope.$rpc = new RPC();  
	
})(typeof exports === 'undefined'? this : global); 

