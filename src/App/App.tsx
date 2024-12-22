import React from "react";
import {Editor} from "./components/Editor/Editor";
import {Header} from "./components/Header/Header";

import "./App.css";

export function App() {
    return (
        <div className="app">
            <Header loadPercentage={1} />
            <Editor />
        </div>
    );
}
