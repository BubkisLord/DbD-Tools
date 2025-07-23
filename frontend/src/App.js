import React from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

function App() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 flex flex-col items-center justify-center px-6">
            <h1 className="text-4xl font-extrabold mb-6 text-indigo-400 drop-shadow-lg tracking-tight text-center">
                Dead by Daylight
            </h1>
            <h1 className="text-6xl font-extrabold mb-6 text-indigo-400 drop-shadow-lg tracking-tight text-center">
                Quiz & Build Generator
            </h1>
            <p className="text-xl text-gray-300 mb-12 text-center max-w-xl">
                Welcome! Select one of the options below to get started: random
                builds, addon quizzes, and perk quizzes are available.
            </p>
            <div className="flex flex-col sm:flex-col gap-6 items-center justify-center w-full">
                <div className="flex flex-row sm:flex-row gap-6 items-center justify-center w-full">
                    <button
                        onClick={() => navigate("/random")}
                        className="w-1/6 bg-indigo-600 hover:bg-indigo-700 transition-colors px-8 py-4 rounded-xl font-semibold text-lg shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-400">
                        Random Build
                    </button>
                    <button
                        onClick={() => navigate("/addons")}
                        className="w-1/6 bg-green-600 hover:bg-green-700 transition-colors px-8 py-4 rounded-xl font-semibold text-lg shadow-xl focus:outline-none focus:ring-2 focus:ring-green-400">
                        Addon Quiz
                    </button>
                    <button
                        onClick={() => navigate("/perks")}
                        className="w-1/6 bg-pink-600 hover:bg-pink-800 transition-colors px-8 py-4 rounded-xl font-semibold text-lg shadow-xl focus:outline-none focus:ring-2 focus:ring-pink-400">
                        Perk Quiz
                    </button>
                </div>
                <div className="flex flex-row sm:flex-row gap-6 items-center justify-center w-full">
                    <button
                        onClick={() => navigate("/randomcustom")}
                        className="w-1/6 bg-cyan-700 hover:bg-cyan-800 transition-colors px-8 py-4 rounded-xl font-semibold text-lg shadow-xl focus:outline-none focus:ring-2 focus:ring-cyan-700">
                        Custom Match Builds
                    </button>
                    <button
                        onClick={() => navigate("/nametheperk")}
                        className="w-1/6 bg-teal-700 hover:bg-teal-800 transition-colors px-8 py-4 rounded-xl font-semibold text-lg shadow-xl focus:outline-none focus:ring-2 focus:ring-teal-700">
                        Name the Perk Quiz
                    </button>
                </div>
            </div>
        </div>
    );
}

export default App;
