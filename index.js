const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const _ = require('lodash');
const io = new Server(server);
var argv = require('minimist')(process.argv.slice(2));

const users = argv['u'].split(",");
const giftsPerUser = argv['g'];

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const connectedUsers = [];

const getName = socket => {
  let row = connectedUsers.find(row => row.socket == socket);
  if (row == undefined) {
    return null;
  }
  return row.name;
};

const getSocket = name => {
  let row = connectedUsers.find(row => row.name == name);
  if (row == undefined) {
    return null;
  }
  return row.socket;
};

const dropUser = name => {
  let idx = connectedUsers.findIndex(row => row.name == name);
  if (row == -1) {
    console.log(`Cannot find ${name}`);
    return false;
  }
  row = connectedUsers.splice(idx, 1);
  if (name != row.name) {
    console.log(`Something is wrong! ${name} != ${row.name}`);
    return false;
  }
  return true;
};

const isEveryoneReady = () => {
  for (const name of users) {
    idx = connectedUsers.findIndex(row => row.name == name);
    if (idx == -1) {
      return false;
    }
  }
  return true;
};

const tryAssigningSecretSantas = () => {
  let allGiftLists = [];
  for (let round = 1; round <= giftsPerUser; round++) {
    for (const name of users) {
      allGiftLists.push([name, round]);
    }
  }
  allGiftLists = _.shuffle(allGiftLists);
  assignments = {};
  for (const name of users) {
    assignments[name] = [];
    for (let round = 1; round <= giftsPerUser; round++) {
      let l = allGiftLists.pop();
      assignments[name].push(l);
    }
  }
  return assignments;
};

const hasDistinctElements = a => {
  return (new Set(a)).size == a.length;
};

const isValidSecretSantasAssignment = (assignment) => {
  for (const name of users) {
    let lists = assignment[name];
    if (!lists) {
      console.log(
	`Cannot find ${name} in ${JSON.stringify(assignment)}`
      );
    }
    let secretSantas = lists.map(l => l[0]);
    if (!hasDistinctElements(secretSantas)
	|| secretSantas.includes(name)) {
      return false;
    }
  }
  return true;
}

const assignSecretSantas = maxAttempts => {
  for (let i = 0; i < maxAttempts; i++) {
    candidate = tryAssigningSecretSantas();
    if (isValidSecretSantasAssignment(candidate)) {
      return candidate;
    } else {
      console.log(`Invalid assignment ${JSON.stringify(candidate)}`);
    }
  }
  console.log("Failed to assign secret santas");
};

const sendSecretSantaAssignments = assignments => {
  for (let name of users) {
    let lists = assignments[name];
    if (!lists) {
      console.log(
	`Cannot find ${name} in ${JSON.stringify(assignments)}`
      );
    }
    let listsStr = lists.map(l => `${l[0]}${l[1]}`).join(", ");
    let socket = getSocket(name);
    socket.emit('secret-santas', listsStr);
  }
};

io.on('connection', socket => {
  socket.on('ready', name => {
    if (users.includes(name)) {
      connectedUsers.push({
	name: name,
	socket: socket
      });
      console.log(`${name} is ready.`);
      if (isEveryoneReady()) {
	assignments = assignSecretSantas(1000);
	if (assignments) {
	  sendSecretSantaAssignments(assignments);
	}
      }
    } else {
      console.log(`Unexpected user ${name}.`);
    }
  });
});

io.on('disconnect', socket => {
  let name = getName(socket);
  if (name == null) {
    console.log("A mysterious user disconnected.");
  }
  success = dropUser(name);
  if (!success) {
    console.log(`Failed to drop user ${name}.`);
  }
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});
