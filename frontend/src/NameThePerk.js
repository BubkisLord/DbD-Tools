import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import PerkSearch from "./PerkSearch";

const API_BASE = "http://localhost:5000/api";

function normaliseDescription(desc) {
    if (!desc) return "";
    return desc
        .trim("<br />")
        .replace(/<img[\s\S]*?>/gi, "")
        .replace(
            /<span[^>]*class="(?:iconLink|pcView|pcIconLink|tooltip|tooltipBaseText|iconless|tooltiptext|flex|flexCenter|tooltipTextWrapper|mobileView|mobileIconLink)"[^>]*>[\s\S]*?<\/span>/gi,
            ""
        )
        .replace(/<span[^>]*typeof="mw:File"[^>]*>[\s\S]*?<\/span>/gi, "")
        .replace(
            /<span[^>]*class="(?:tooltiptext flex flexCenter|mobileView mobileIconLink)"[^>]*>\s*<\/span>/gi,
            ""
        )
        .replace(
            /<span[^>]*class="luaClr[^"]*"[^>]*>\s*["“”']*\s*<\/span>\s*/gi,
            ""
        )
        .replace(/<br\s*\/?>/gi, '<br style="line-height:2.5;" />')
        .replace(/\n/g, '<div style="height:0.5em"></div>')
        .replace(
            /(<div style="height:0\.5em"><\/div>|<p><\/p>|<br\s*\/?>)+$/gi,
            ""
        )
        .replace(
            /((<\/ul>\s*)?(<div style="height:0\.5em"><\/div>|<p><\/p>|<br\s*\/?>|\s)+)+$/gi,
            ""
        );
}

function NameThePerk() {
    const [loading, setLoading] = useState(false);
    const [perkData, setPerkData] = useState(null);
    const [error, setError] = useState("");
    const [role, setRole] = useState("any");
    const [updateMsg, setUpdateMsg] = useState("");
    const [selectedCharacters, setSelectedCharacters] = useState([]);
    const [selectedPerkName, setSelectedPerkName] = useState(null);
    const [isCorrect, setIsCorrect] = useState(null);
    const [winHistory, setWinHistory] = useState([]);
    const [typedAnswer, setTypedAnswer] = useState("");
    const [img_rotation, set_img_rotation] = useState("");
    const [img_blur, set_img_blur] = useState("");

    const [settingOptions] = useState([
        {
            id: "Q_use_long_description",
            label: "Use Long Description (Otherwise Short Description)",
            defaultValue: false
        },
        {
            id: "Q_use_image",
            label: "Use Image (Overrides Descriptions)",
            defaultValue: false
        },
        {
            id: "Q_use_image_rotation",
            label: "Add Image Rotation (Requires Image Option)",
            defaultValue: false
        },
        {
            id: "Q_use_image_blur",
            label: "Add Image Blur (Requires Image Option)",
            defaultValue: false
        }
    ]);

    const [settings, setSettings] = useState(
        settingOptions.filter((opt) => opt.defaultValue).map((opt) => opt.id)
    );

    const fetchPerks = useCallback(async () => {
        setLoading(true);
        setError("");
        setPerkData(null);
        setSelectedPerkName(null);
        setTypedAnswer("");
        setIsCorrect(null);
        try {
            const res = await fetch(`${API_BASE}/random_perks?role=${role}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" }
            });
            if (!res.ok) throw new Error("Failed to fetch perk set.");
            const data = await res.json();
            setPerkData(data);
        } catch (e) {
            setError(e.message);
        }
        setLoading(false);
    }, [role]);

    const updateDatabase = async () => {
        setLoading(true);
        setUpdateMsg("");
        setError("");
        try {
            const res = await fetch(`${API_BASE}/update_perks`, {
                method: "POST"
            });
            const data = await res.json();
            if (data.status === "success") {
                setUpdateMsg("Perk database updated!");
            } else {
                setError(data.message || "Update failed");
            }
        } catch (e) {
            setError(e.message);
        }
        setLoading(false);
    };

    const handleSubmit = (answer = typedAnswer) => {
        console.log("Submitting answer:", answer);

        if (!answer || !perkData?.chosen_perk) {
            setIsCorrect(false);
            return;
        }

        const normalizedTyped = answer.trim().toLowerCase();
        const normalizedCorrect = perkData.chosen_perk.name
            .trim()
            .toLowerCase();

        const correct = normalizedTyped === normalizedCorrect;

        setIsCorrect(correct);

        setWinHistory((prev) => [
            ...prev,
            { perkName: perkData.chosen_perk.name, correct }
        ]);

        setTypedAnswer("");
        // Comment these if it should say "Correct: try again?" or whatever
        setSelectedPerkName(null);
        fetchPerks();
    };

    // Load characters on role change
    useEffect(() => {
        setSelectedCharacters([]);
        fetch(`${API_BASE}/characters?role=${role}`)
            .then((res) => res.json())
            .then((data) => {
                setSelectedCharacters(data.characters || []);
            });
    }, [role]);

    // Handle image rotation and blur classes on icon or settings change
    useEffect(() => {
        if (settings.includes("Q_use_image_rotation")) {
            const rotation = Math.floor(Math.random() * 360);
            set_img_rotation(`${rotation}deg`);
        } else {
            set_img_rotation("0deg");
        }

        if (settings.includes("Q_use_image_blur")) {
            set_img_blur("blur-[4px]");
        } else {
            set_img_blur("blur-0");
        }
    }, [perkData?.chosen_perk?.icon, settings]);

    // Settings toggler
    const handleCheckbox = (id) => {
        setPerkData(null);
        setSettings((prev) =>
            prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]
        );
    };

    const selectAll = () => setSettings(settingOptions.map((opt) => opt.id));
    const deselectAll = () => setSettings([]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 flex flex-row items-start py-8">
            <Link
                to="/"
                className="text-indigo-400 hover:text-indigo-300 absolute font-medium text-sm mt-4 ml-4 z-20">
                ← Back to Home
            </Link>

            <div className="flex-1">
                <h1 className="text-5xl font-extrabold mb-4 text-indigo-400 drop-shadow-lg tracking-tight text-center">
                    DbD Name the Perk
                </h1>

                <div className="flex flex-row items-start w-screen-xl mx-auto">
                    {/* Settings Panel */}
                    <div className="w-1/4 h-[850px] bg-gray-900/90 rounded-xl shadow-2xl p-8 mt-4 border border-gray-700 flex flex-col items-start text-left ml-4 mr-3">
                        <h2 className="text-2xl font-bold mb-4 text-indigo-300">
                            Settings
                        </h2>

                        <div className="mb-4 w-full">
                            <label className="block mb-2 font-semibold">
                                Perk Type:
                            </label>
                            <select
                                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                value={role}
                                onChange={(e) => {
                                    setRole(e.target.value);
                                    setPerkData(null);
                                    setSelectedPerkName(null);
                                    setTypedAnswer("");
                                    setIsCorrect(null);
                                }}
                                disabled={loading}>
                                <option value="any">All Perks</option>
                                <option value="killer">Killer Perks</option>
                                <option value="survivor">Survivor Perks</option>
                            </select>

                            <div className="flex flex-row items-start gap-2 w-full">
                                <button
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 transition-colors px-5 py-2 rounded-lg font-semibold shadow focus:outline-none focus:ring-2 focus:ring-indigo-400 mt-4"
                                    onClick={updateDatabase}
                                    disabled={loading}>
                                    Reinitialise Database
                                </button>
                                <button
                                    className="w-full bg-green-600 hover:bg-green-700 transition-colors px-5 py-2 rounded-lg font-semibold shadow focus:outline-none focus:ring-2 focus:ring-green-400 mt-4"
                                    onClick={fetchPerks}
                                    disabled={loading}>
                                    Start Perk Quiz
                                </button>
                            </div>

                            {loading && (
                                <div className="mt-4 text-yellow-400 font-semibold animate-pulse">
                                    Loading...
                                </div>
                            )}
                            {updateMsg && (
                                <div className="mt-4 text-green-400 font-semibold">
                                    {updateMsg}
                                </div>
                            )}
                            {error && (
                                <div className="mt-4 text-red-400 font-semibold">
                                    {error}
                                </div>
                            )}
                        </div>

                        <div className="mb-4 w-full">
                            <div className="flex gap-2 mb-2">
                                <button
                                    className="bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded text-xs font-semibold"
                                    onClick={selectAll}
                                    disabled={loading}>
                                    Select All
                                </button>
                                <button
                                    className="bg-gray-700 hover:bg-gray-800 px-3 py-1 rounded text-xs font-semibold"
                                    onClick={deselectAll}
                                    disabled={loading}>
                                    Deselect All
                                </button>
                            </div>

                            <div
                                className="overflow-y-auto max-h-[550px] border border-gray-800 rounded-md p-2 bg-gray-800/60 scrollbar-thin scrollbar-thumb-indigo-600 scrollbar-track-gray-900 scrollbar-thumb-rounded-full scrollbar-track-rounded-full"
                                style={{
                                    scrollbarColor: "#4f46e5 #1a202c",
                                    scrollbarWidth: "thin"
                                }}>
                                <style>
                                    {`
                  /* For Chrome, Edge, and Safari */
                  .scrollbar-thin::-webkit-scrollbar {
                    width: 8px;
                    border-radius: 8px;
                  }
                  .scrollbar-thin::-webkit-scrollbar-thumb {
                    background: #4f46e5;
                    border-radius: 8px;
                  }
                  .scrollbar-thin::-webkit-scrollbar-track {
                    background: #1a202c;
                    border-radius: 8px;
                  }
                `}
                                </style>

                                {settingOptions.map(({ id, label }) => (
                                    <label
                                        key={id}
                                        className="flex items-center gap-2 py-1 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.includes(id)}
                                            onChange={() => handleCheckbox(id)}
                                            className="accent-indigo-500"
                                            disabled={loading}
                                        />
                                        <span className="text-sm">{label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Main Perk Quiz Panel */}
                    {perkData ? (
                        <div
                            className="w-1/2 h-[850px] bg-gray-900/90 rounded-xl shadow-2xl p-8 mt-4 border border-gray-700 relative overflow-hidden scrollbar-thin scrollbar-thumb-indigo-600 scrollbar-track-gray-900 scrollbar-thumb-rounded-full scrollbar-track-rounded-full"
                            style={{
                                maxHeight: "850px",
                                scrollbarColor: "#4f46e5 #1a202c",
                                scrollbarWidth: "thin"
                            }}>
                            {perkData.killer && perkData.killer.icon && (
                                <img
                                    src={perkData.killer.icon}
                                    alt={perkData.killer.name}
                                    className="absolute opacity-15 pointer-events-none select-none"
                                    style={{
                                        top: "63%",
                                        left: "50%",
                                        transform:
                                            "translate(-50%, -50%) scale(6)",
                                        zIndex: 0,
                                        filter: "blur(1px)"
                                    }}
                                />
                            )}

                            <h2 className="text-3xl font-extrabold mb-4 text-pink-400 tracking-wide drop-shadow relative z-10">
                                {perkData.killer
                                    ? "Killer Perk"
                                    : "Survivor Perk"}
                                <br />
                            </h2>

                            <div className="relative z-10">
                                <h3 className="font-bold text-3xl mb-4 text-indigo-300 tracking-tight">
                                    Guess the Perk:
                                </h3>

                                {selectedPerkName === null ? (
                                    <>
                                        <div className="mb-4">
                                            {settings.includes(
                                                "Q_use_image"
                                            ) ? (
                                                perkData.chosen_perk?.icon ? (
                                                    <div className="w-20 h-20 rounded shadow border border-gray-700 bg-gray-800 flex items-center justify-center overflow-hidden">
                                                        <img
                                                            src={
                                                                perkData
                                                                    .chosen_perk
                                                                    .icon
                                                            }
                                                            alt={
                                                                perkData
                                                                    .chosen_perk
                                                                    .name
                                                            }
                                                            className={`transform ${img_blur}`}
                                                            style={{
                                                                marginTop: 6,
                                                                rotate: img_rotation
                                                            }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-gray-400 whitespace-pre-line">
                                                        ERROR: No image found.
                                                    </div>
                                                )
                                            ) : !settings.includes(
                                                  "Q_use_long_description"
                                              ) ? (
                                                <div
                                                    className="text-sm text-gray-400 whitespace-pre-line"
                                                    dangerouslySetInnerHTML={{
                                                        __html: (() => {
                                                            const raw =
                                                                normaliseDescription(
                                                                    perkData
                                                                        .chosen_perk
                                                                        .description,
                                                                    true
                                                                ).replaceAll(
                                                                    perkData
                                                                        .chosen_perk
                                                                        .name,
                                                                    "[THIS PERK]"
                                                                );

                                                            const lines =
                                                                raw.split(
                                                                    /<\s*(br|div)[^>]*>/i
                                                                );

                                                            const cleanedLines =
                                                                lines
                                                                    .map(
                                                                        (
                                                                            line
                                                                        ) =>
                                                                            line
                                                                                .replaceAll(
                                                                                    "div",
                                                                                    ""
                                                                                )
                                                                                .replaceAll(
                                                                                    "br",
                                                                                    ""
                                                                                )
                                                                                .trim()
                                                                    )
                                                                    .filter(
                                                                        (
                                                                            line
                                                                        ) =>
                                                                            line !==
                                                                            ""
                                                                    );

                                                            const shouldIncludeSecondLine =
                                                                raw.includes(
                                                                    "your Aura-reading ability"
                                                                );

                                                            return shouldIncludeSecondLine
                                                                ? cleanedLines
                                                                      .slice(
                                                                          0,
                                                                          2
                                                                      )
                                                                      .join("")
                                                                : cleanedLines[0];
                                                        })()
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    className="text-sm text-gray-400 whitespace-pre-line"
                                                    dangerouslySetInnerHTML={{
                                                        __html: normaliseDescription(
                                                            perkData.chosen_perk
                                                                .description,
                                                            true
                                                        ).replaceAll(
                                                            perkData.chosen_perk
                                                                .name,
                                                            "[THIS PERK]"
                                                        )
                                                    }}
                                                />
                                            )}
                                        </div>

                                        <PerkSearch
                                            role="any"
                                            value={typedAnswer || ""}
                                            onChange={(val) => {
                                                setTypedAnswer(val);
                                                setSelectedPerkName(null);
                                                setIsCorrect(null);
                                            }}
                                            onSelect={(perk) => {
                                                setTypedAnswer(perk.name);
                                                setSelectedPerkName(perk.name);
                                                setIsCorrect(null);
                                                handleSubmit(perk.name); // Pass selected name explicitly
                                            }}
                                        />
                                    </>
                                ) : (
                                    <button
                                        className={`w-full ${
                                            isCorrect
                                                ? "bg-green-600 hover:bg-green-700"
                                                : "bg-indigo-700 hover:bg-indigo-600"
                                        } transition-colors px-5 py-2 rounded-lg font-semibold shadow focus:outline-none focus:ring-2 ${
                                            isCorrect
                                                ? "focus:ring-green-400"
                                                : "focus:ring-indigo-400"
                                        }`}
                                        onClick={fetchPerks}
                                        disabled={
                                            loading ||
                                            selectedCharacters.length === 0
                                        }>
                                        {isCorrect
                                            ? "Correct: Go Again!"
                                            : "Incorrect: Try Again"}
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div
                            className="w-1/2 min-h-[850px] bg-gray-900/90 rounded-xl shadow-2xl p-8 mt-4 border border-gray-700 relative overflow-x-hidden overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-600 scrollbar-track-gray-900 scrollbar-thumb-rounded-full scrollbar-track-rounded-full"
                            style={{
                                maxHeight: "850px",
                                scrollbarColor: "#4f46e5 #1a202c",
                                scrollbarWidth: "thin"
                            }}
                        />
                    )}

                    {/* Win History Panel */}
                    <div className="w-1/4 max-h-[850px] min-h-[850px] bg-gray-900/90 rounded-xl shadow-2xl p-8 mt-4 border border-gray-700 flex flex-col items-start text-left ml-3 mr-4">
                        <h2 className="text-2xl font-bold mb-4 text-indigo-300">
                            Win History
                        </h2>
                        {winHistory.length === 0 ? (
                            <p className="text-sm text-gray-400">
                                No attempts yet.
                            </p>
                        ) : (
                            <ul className="w-full h-full space-y-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-indigo-600 scrollbar-track-gray-900 scrollbar-thumb-rounded-full scrollbar-track-rounded-full">
                                {winHistory
                                    .slice()
                                    .reverse()
                                    .map((entry, idx) => (
                                        <li
                                            key={idx}
                                            className={`flex justify-between items-center px-3 py-2 rounded-md ${
                                                entry.correct
                                                    ? "bg-green-700 text-white"
                                                    : "bg-red-700 text-white"
                                            }`}>
                                            <span className="font-semibold text-sm">
                                                {entry.perkName ||
                                                    "Unknown Perk"}
                                            </span>
                                            <span className="text-xs font-bold uppercase tracking-wide">
                                                {entry.correct
                                                    ? "Correct"
                                                    : "Incorrect"}
                                            </span>
                                        </li>
                                    ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default NameThePerk;
