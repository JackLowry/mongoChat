const mongo = require('mongodb').MongoClient;
const client = require('socket.io').listen(4000).sockets;

// Connect to mongo
mongo.connect('mongodb://127.0.0.1/mongochat', function(err, db){
    if(err){
        throw err;
    }

    console.log('MongoDB connected...');

    // Connect to Socket.io
    client.on('connection', function(socket){
        var currentServer = null;

        // Create function to send status
        sendStatus = function(s){
            socket.emit('status', s);
        }

        // Get chats from mongo collection
        socket.on('change_server', function(data){
          currentServer = data.servername;

          db.collection(currentServer + "_chat*").find().limit(100).sort({_id:1}).toArray(function(err, res){
              if(err){
                  throw err;
              }

                socket.emit('output', res);
          });

          socket.emit(getServerNames());
        });

        // Handle input events
        socket.on('input', function(data){
            let name = data.name;
            let message = data.message;

            // Check for name and message
            if(message == ''){
                // Send error status
                sendStatus('Please enter a message');
            } else {
                // Insert message
                db.collection(currentServer + "_chat*").insert({name:name, message: message}, function() {
                    client.emit('output', [data]);

                    // Send status object
                    sendStatus({
                        message: 'Message sent',
                        clear: true
                    });
                });
            }
        });

        // Handle clear
        socket.on('clear', function(data){
            // Remove all chats from collection
            db.collection(currentServer + "_chat*").remove({}, function(){
                // Emit cleared
                socket.emit('cleared');
            });
        });

        socket.on('signUp', function(data){
            let un = data.username;
            let pw = data.password;


            db.collection("users*").find({"username":un}).toArray(function(err, res) {
              if(err) {
                throw err;
              }
              if(res.length == 0) {
                console.log("signed up");
                db.collection("users").insert({username: un, password: pw}, function(){
                  client.emit('registered');
                });
              }
              else {
                client.emit('username_taken');
              }
            });
        });

        socket.on('login', function(data) {
          let username = data.username;
          let password = data.password;

          db.collection("users*").find({username,password}).toArray(function(err, res) {
            if(err) {
              throw err;
            }

            if(res.length == 0) {
              socket.emit('authorized');
            }
            else {
              socket.emit('unauthorized');
            }
          });
        });

        socket.on('create_server',function(data){
            createServer(data.serverName);
        });

        function createServer(serverName) {
          db.listCollections().toArray(function(err, res){
            if(err) {
              throw err;
            }


            var created = false;
            for(var i = 0; i < res.length; i++) {
                if(serverName == res[i]) {
                  created = true;
                  break;
                }
            }

            if(created) {
              socket.emit('server_name_taken');
            }
            else {
              currentServer = serverName;
              socket.emit('server_created');
            }
          });
        }

        function getServerNames() {
          db.listCollections().toArray(function(err, res){
            if(err) {
              throw err;
            }

            nameSet = new Set();

            for(var x = 0; x < res.length; x++) {
              var name = res[x].name.substring(0, res[x].name.indexOf('_chat*'));

              if(!(name === "users*")) {
                nameSet.add(name);
              }
            }

            console.log(nameSet);
            console.log(res);

            return Array.from(nameSet);
          });
        }
      });


    });
