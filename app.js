const http = require('http');
const path = require('path');
const url = require('url');
//const cluster = require('cluster');
//const numCPUs = require('os').cpus().length;
const util = require('./utilmodule');
const httpPort = process.env.PORT || 3000;
const WebSocket = require('ws');


const userName = {};

// UNCOMMENT WHEN UPLOADING THE PROJECT TO LIVE-SERVER/INTERNET/WEBHOSTING
/*if(cluster.isMaster){
// IF THIS IS THE MASTER PROCESS, FORK WORKERS EQUAL TO THE NUMBER OF CPU'S
	for(let i=0; i<numCPUs; i++){
		cluster.fork();
	}

	// EVENT LISTENER FOR WHEN A WORKER PROCESS EXITS
	cluster.on('exit', (worker,code,signal)=>{
		console.log(`Worker ${worker.process.pid} died`);
	// FORK A NEW WORKER TO REPLACE THE ONE THAT EXITED
		cluster.fork();
	});
}else{*/

	// IF THIS IS A WORKER PROCESS, CREATE THE SERVER
const server = http.createServer((req, res)=>{

	const parsedUrl = url.parse(req.url, true);
	
	// IF URL HAS NO QUERY STRING
    if(parsedUrl.search === null){
    	
		// SILENCING ANNOYING FAVICON ERROR - NO WEBSITE ICON YET 
		if(req.url === '/favicon.ico'){
			res.writeHead(200, {'Content-Type': 'image/x-icon'});
			res.end();
			return;
		}

		// EVALUATION FOR THE CLIENT REQUEST FOR INDEX.HTML FILE AND OTHER FILES
		let filePath;
		if(req.url === '/' && req.method === 'GET'){
			let cookies = util.parseCookies(req.headers.cookie);
			let sessionID;
			if(cookies){
				sessionID = cookies.sessidrps
			}
			console.log('util.checkUserStatus(sessionID)', util.checkUserStatus(sessionID));
			console.log('util.loadsessIDFromJSON() sa get \: ', util.loadsessIDFromJSON());
			if(util.checkUserStatus(sessionID)){
				util.sessionedUser(res,cookies.sessidrps);
			}else{
				filePath = `${__dirname}/misc/html/index.html`;
				util.serverResponseHeader(res,filePath);
			}

		// ACTUAL SETTING OF COOKIE/SESSION, ADDING USER NAME AND USER STATUS
		}else if(req.url === '/' && req.method === 'POST'){
			let data;
			const sessID = {};
			req.on('data', chunk => {
				data = chunk.toString();		
			 });
		  	req.on('end', () => {
		  		// STEP 1: SPLIT THE STRING INTO AN ARRAY BASED ON THE '=' CHARACTER
				const dataArray = data.split('=');
				// STEP 2: SET THE PROPERTIES BASED ON THE KEY-VALUE PAIRS
				userName[dataArray[0]] = dataArray[1];
				// OUTPUT: { NAME: 'JOHN DOE' }

				// CREATE UNIQUE ID FOR SESSION
				const newSessionId = util.generateSessionToken();
				const userID = util.generateSessionToken();
				sessID[newSessionId] = {}; // INITIALIZE AN EMPTY SESSION OBJECT
				// STORE THE SESSION INFORMATION IN THE SESSID VARIABLE.
				sessID[newSessionId].name = userName.name;
				sessID[newSessionId].userID = userID;
				sessID[newSessionId].status = true;
				// ADD SESSION DATA BACK TO THE JSON FILE
				util.addUserToJSON(sessID);
				const oneYearFromNow = new Date();
				oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
				res.setHeader('Set-Cookie', `sessidrps=${newSessionId};Expires=${oneYearFromNow.toUTCString()};SameSite=none;secure;HttpOnly;Path=/`);
				res.writeHead(302,{'Location': '/'});
				res.end();
			});

		// FOR /MAIN ROUTE
		}else if(req.url === '/main' && req.method === 'GET'){
			let cookies = util.parseCookies(req.headers.cookie);
			if(util.editStatusInJson(cookies.sessidrps,true)){
				console.log('Change status in JSON file successful!');
				res.writeHead(302,{'Location': '/'});
				res.end();
			}else{
				res.writeHead(500, { 'Content-Type': 'text/plain' });
      			res.end('Internal Server Error');
			}
				
		// FOR LOGGING OUT THE USER 
		}else if(req.url === '/logout' && req.method === 'GET'){
			console.log('req.url', req.url);
			let cookies = util.parseCookies(req.headers.cookie);
			let sessionID; 
			if(cookies){
				sessionID = cookies.sessidrps;
			}
			console.log('util.editStatusInJson(sessionID,false): ',util.editStatusInJson(sessionID,false));
			if(util.editStatusInJson(sessionID,false)){
				res.writeHead(302,{'Location': '/'});
				res.end();
			}else{
				res.writeHead(500, { 'Content-Type': 'text/plain' });
      			res.end('Internal Server Error');
			}

		// RESPONSE FOR THE STATIC FILES
		}else if(req.url.startsWith('/assets/')){
			filePath = path.join(__dirname, 'misc', req.url.slice(7));
			console.log(filePath);
			util.serverResponseHeader(res,filePath);

		// IF USER TYPE AN UNKNOWN ROUTE IN URL 
		}else{
			res.statusCode = 404;
			res.write('<h1>Page not found</h1>');
			res.end();
		}
	// IF URL HAS QUERY STRING		
	}else{
		const {pathname, query} = parsedUrl;
		if(pathname === '/set'){
			util.editStatusInJson(query.newUUIDKey,true);
			const oneYearFromNow = new Date();
			oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
			res.setHeader('Set-Cookie', `sessidrps=${query.newUUIDKey};Expires=${oneYearFromNow.toUTCString()};SameSite=none;secure;HttpOnly;Path=/`);
			res.writeHead(302,{'Location': '/'});
			res.end();
		}else{
			res.statusCode = 404;
			res.write('<h1>Page not found</h1>');
			res.end();
		}
	}
});

const wsServer = server.listen(httpPort,'0.0.0.0', ()=>{
	console.log(`Server is running on http://localhost:${httpPort}`);
});
util.webSocketConnections(wsServer);
//}