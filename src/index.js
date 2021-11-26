import React, { Component } from "react";
import ReactDOM from "react-dom";
import io from 'socket.io-client';

var socket = io();
var handle = null;

var appState = {
  ready: false,
  allUsers: [],
  readyUsers: [],
  secretSantas: null
};

function syncAppState() {
  handle.setState(
    JSON.parse(JSON.stringify(appState))
  );
}

const UserButtons = (props) => {
  let buttons = props.allUsers.map(name => React.createElement(
    "button",
    {
      onClick: () => {
	appState.ready = true;
	socket.emit('ready', name);
	syncAppState();
      }
    },
    React.createElement("h1", {}, name)
  ));
  return React.createElement(
    "div",
    {},
    React.createElement("h1", {}, "Who are you?"),
    ...buttons
  );
};

const ReadyUsers = (props) => {
  return React.createElement(
    "div",
    {},
    ...props.readyUsers.map(name => React.createElement(
      "h1", {}, `${name} is ready!`
    ))
  );
};

const SecretSantas = (props) => {
  return React.createElement(
    "div",
    {},
    React.createElement("h1", {}, "Your Secret Santa assignments are:"),
    ...props.secretSantas.map(text => React.createElement(
      "h1", {}, text
    ))
  );
};

class Page extends React.Component {
  constructor(props) {
    super(props);
    handle = this;
  };

  render() {
    let s = this.state;
    // React error if render doesn't return a component.
    if (!s) { return React.createElement("div"); }
    const children = [];
    if (!s.ready) {
      children.push(
	React.createElement(
	  UserButtons,
	  { allUsers: s.allUsers, readyUsers: s.readyUsers }
	)
      );
    }
    if (!s.secretSantas) {
      children.push(
	React.createElement(
	  ReadyUsers,
	  { readyUsers: s.readyUsers }
	)
      );
    }
    if (s.secretSantas) {
      children.push(
	React.createElement(
	  SecretSantas,
	  { secretSantas: s.secretSantas }
	)
      );
    }
    return React.createElement(
      "div",
      {},
      ...children
    );
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const div = document.getElementById("main-div");
  const page = React.createElement(Page);
  ReactDOM.render(page, div);
  syncAppState();

  socket.on("all-users", allUsers => {
    appState.allUsers = allUsers;
    syncAppState();
  });

  socket.on("ready-users", readyUsers => {
    appState.readyUsers = readyUsers;
    syncAppState();
  });
  
  socket.on("secret-santas", secretSantas => {
    appState.secretSantas = secretSantas;
    syncAppState();
  });
      
});
