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
        let users = db.collection('users');

        // Create function to send status
        sendStatus = function(s){
            socket.emit('status', s);
        }

        // Get chats from mongo collection
        socket.on('reload_chat', function(data){
          db.collection(data.username).find().limit(100).sort({_id:1}).toArray(function(err, res){
              if(err){
                  throw err;
              }

              // Emit the messages
              socket.emit('output', res);
          });
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
                chat.insert({name: name, message: message}, function(){
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
            chat.remove({}, function(){
                // Emit cleared
                socket.emit('cleared');
            });
        });

        socket.on('signUp', function(data){
            let un = data.username;
            let pw = data.password;


            users.find({"username":un}).toArray(function(err, res) {
              if(err) {
                throw err;
              }
              if(res.length == 0) {
                users.insert({username: un, password: pw}, function(){
                  client.emit('registered');
                });
              }
              else {
                client.emit('username_taken');
              }
            });
        });

        socket.on('create_server', function(data) {
          let servername = data.servername;
          let newServer = createServer();
        });

        socket.on('login', function(data) {
          let username = data.username;
          let password = data.password;

          users.find({username,password}).toArray(function(err, res) {
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

        socket.on('create_server',function(){

        })
      });

      function createServer(serverName) {
        db.getCollectionNames(function(err, res){
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
            let newServer = db.collection(serverName);
            newServer.insert({chat:{}}, function() {
              socket.emit('server_created');
            });
          }
      });
    }
});
