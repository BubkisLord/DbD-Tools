import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AddonMinigame from "./AddonMinigame";
import PerkMinigame from "./PerkMinigame";
import RandomBuild from "./RandomBuild";
import NameThePerk from "./NameThePerk";
import CustomMatchBuilds from "./CustomMatchBuilds";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
    <React.StrictMode>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<App />} />
                <Route path="/random" element={<RandomBuild />} />
                <Route path="/randomcustom" element={<CustomMatchBuilds />} />
                <Route path="/addons" element={<AddonMinigame />} />
                <Route path="/perks" element={<PerkMinigame />} />
                <Route path="/nametheperk" element={<NameThePerk />} />
            </Routes>
        </BrowserRouter>
    </React.StrictMode>
);
