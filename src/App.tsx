import React, { useState, useEffect } from "react";
import axios from "axios";

import logo from "./barnes_logo.png";
import "./App.css";

function App() {

  const [server_time, setTime] = useState();
  const [version_info, setVersion] = useState([{id: '', message:'', created_at:''}]);

 
  useEffect(() => {

    async function getServerTime() {
      const result = await axios(
        'http://127.0.0.1:8000/api/time/',
      );
      setTime(result.data);
    }

    async function getVersionInfo() {
      const result = await axios(
        'http://127.0.0.1:8000/api/version/',
      );
      console.log(result);
      setVersion(result.data);
    }

    getServerTime();
    getVersionInfo();
  }, []);




  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" /> 
        <p className="HelloWorld">Hello World! it's {server_time} at GIS server</p>
        <p>GIS6 version information: {version_info[0].message} created at: {version_info[0].created_at}</p>
      </header>
     
    </div>
  );
}

export default App;
