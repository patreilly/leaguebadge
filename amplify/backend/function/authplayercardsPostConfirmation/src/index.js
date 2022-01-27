/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	STORAGE_PLAYERS_ARN
	STORAGE_PLAYERS_NAME
Amplify Params - DO NOT EDIT *//*
  this file will loop through all js modules which are uploaded to the lambda resource,
  provided that the file names (without extension) are included in the "MODULES" env variable.
  "MODULES" is a comma-delimmited string.
*/
const moduleNames = process.env.MODULES.split(',');
const modules = moduleNames.map(name => require(`./${name}`));

var AWS = require("aws-sdk");

var docClient = new AWS.DynamoDB.DocumentClient();

var table = process.env.STORAGE_PLAYERS_NAME;

exports.handler = (event, context, callback) => {
  for (let i = 0; i < modules.length; i += 1) {
    const { handler } = modules[i];
    handler(event, context, callback);
  }
  console.log(context);
  console.log(event);

  function isEmpty(object) {  
    return Object.keys(object).length === 0
  }

  var playerId = event.request.userAttributes.sub;
  var playerEmail = event.request.userAttributes.email
  var playerEmailVerified = event.request.userAttributes.email_verified
  
  console.log('Player ID', playerId)

  var getParams = {
    TableName:table,
    Key:{
        "id": playerId
    }
  };

  docClient.get(getParams, function(err, data) {
    if(err){
      console.log(err)
    }
    else {
      console.log(data)
      if(isEmpty(data)){
        console.log(`No existing user found for player id ${playerId}. Creating one...`)
        var putParams = {
          TableName:table,
          Item:{
              "id": playerId,
              "league_admin": [],
              "email": playerEmail,
              "email_verified": playerEmailVerified
          }
        };
      
        docClient.put(putParams, function(err, data) {
          if (err) console.log(err);
          else console.log(data);
        });
      }
      else {
        console.log(`Existing user found for player id ${playerId}. Doing nothing...`)
      }
    }
  })
};
