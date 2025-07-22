// Import React and two hooks: useEffect (for side effects) and useState (for state management)
import React, { useEffect, useState } from "react";

// Define the main App component
function App() {
  // Declare a state variable 'msg' and a function 'setMsg' to update it
  // useState("") initializes 'msg' as an empty string
  const [msg, setMsg] = useState("");

  // useEffect runs the function inside it after the component mounts (loads)
  // The empty array [] means it only runs once, not on every render
  useEffect(() => {
    // Fetch makes an HTTP GET request to the backend API endpoint
    fetch("http://localhost:8000/api/hello")
      // .then() is a method that runs after the previous promise resolves
      // 'res' is just a variable name for the response object returned by fetch
      .then((res) => res.json()) // res.json() parses the response body as JSON
      // The next .then() runs after the JSON is parsed
      // 'data' is just a variable name for the parsed JSON object
      .then((data) => setMsg(data.message)) // setMsg sets 'msg' to the value of the 'message' property in the JSON
      // .message is not a function, it's accessing the 'message' key in the JSON object
      .catch((err) => setMsg("Error: " + err.message)); // If there's an error, set 'msg' to the error message
  }, []);

  // Render the UI: a heading and a paragraph showing the message from the backend
  return (
    <div>
      <h1>React + FastAPI Test</h1>
      {/* Display the message from the backend or an error */}
      <p>{msg}</p>
    </div>
  );
}

// Export the App component so it can be used by React
export default App;