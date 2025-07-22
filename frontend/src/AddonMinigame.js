import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const API_BASE = "http://localhost:5000/api";

// Normalise and clean up HTML description for addons/perks
function normaliseDescription(desc, isAddon = false) {
    if (!desc) return "";
    let cleaned = desc
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
        // Remove empty quote lines (span with only quotes and spaces)
        .replace(
            /<span[^>]*class="luaClr[^"]*"[^>]*>\s*["“”']{1,2}\s*["“”']{1,2}\s*<\/span>\s*/gi,
            ""
        )
        .replace(
            /<span[^>]*class="luaClr[^"]*"[^>]*>\s*["“”']*\s*<\/span>\s*/gi,
            ""
        )
        .replace(
            /<br\s*\/?>/gi,
            isAddon
                ? '<br style="line-height:0.01;" />'
                : '<br style="line-height:2.5;" />'
        )
        .replace(/\n/g, '<div style="height:0.5em"></div>')
        .replace(
            /(<div style="height:0\.5em"><\/div>|<p><\/p>|<br\s*\/?>)+$/gi,
            ""
        )
        .replace(
            /((<\/ul>\s*)?(<div style="height:0\.5em"><\/div>|<p><\/p>|<br\s*\/?>|\s)+)+$/gi,
            ""
        );
    return cleaned;
}

function AddonMinigame() {
    const [loading, setLoading] = useState(false);
    const [addonData, setAddonData] = useState(null);
    const [error, setError] = useState("");
    const [role, setRole] = useState("killer");
    const [updateMsg, setUpdateMsg] = useState("");
    const [characterList, setCharacterList] = useState([]);
    const [selectedCharacters, setSelectedCharacters] = useState([]);
    const [selectedAddonName, setSelectedAddonName] = useState(null);
    const [isCorrect, setIsCorrect] = useState(null);

    // Fetch character list on role change
    useEffect(() => {
        setCharacterList([]);
        setSelectedCharacters([]);
        fetch(`${API_BASE}/characters?role=${role}`)
            .then((res) => res.json())
            .then((data) => {
                setCharacterList(data.characters || []);
                setSelectedCharacters(data.characters || []);
            });
    }, [role]);

    const fetchAddons = async () => {
        setLoading(true);
        setError("");
        setAddonData(null);
        setSelectedAddonName(null);
        try {
            const res = await fetch(`${API_BASE}/random_addons?role=${role}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ allowed: selectedCharacters })
            });
            if (!res.ok) throw new Error("Failed to fetch build:", res.error);
            const data = await res.json();
            setAddonData(data);
        } catch (e) {
            setError(e.message);
        }
        setLoading(false);
    };

    const updateDatabase = async () => {
        setLoading(true);
        setUpdateMsg("");
        setError("");
        try {
            const res = await fetch(`${API_BASE}/update`, { method: "POST" });
            const data = await res.json();
            if (data.status === "success") {
                setUpdateMsg("Database updated!");
            } else {
                setError(data.message || "Update failed");
            }
        } catch (e) {
            setError(e.message);
        }
        setLoading(false);
    };

    const handleCheckbox = (name) => {
        setSelectedCharacters((prev) =>
            prev.includes(name)
                ? prev.filter((n) => n !== name)
                : [...prev, name]
        );
    };

    const handleAddonClick = (clickedAddon) => {
        setSelectedAddonName(clickedAddon.name);
        setIsCorrect(clickedAddon.name === addonData.chosen_addon.name);
    };

    const selectAll = () => setSelectedCharacters(characterList);
    const deselectAll = () => setSelectedCharacters([]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 flex flex-row items-start py-8">
            <Link
                to="/"
                className="text-indigo-400 hover:text-indigo-300 absolute font-medium text-sm mt-4 ml-4 z-20">
                ← Back to Home
            </Link>
            <div className="flex-1">
                <h1 className="text-5xl font-extrabold mb-4 text-indigo-400 drop-shadow-lg tracking-tight text-center">
                    DbD Addons Quiz
                </h1>
                <div className="flex flex-row items-start w-screen-xl mx-auto">
                    {/* Settings Panel */}
                    <div className="w-1/4 max-h-[850px] bg-gray-900/90 rounded-xl shadow-2xl p-8 mt-4 border border-gray-700 flex flex-col items-start text-left ml-4 mr-3">
                        <h2 className="text-2xl font-bold mb-4 text-indigo-300">
                            Settings
                        </h2>
                        <div className="mb-4 w-full">
                            <label className="block mb-2 font-semibold">
                                Addon Type:
                            </label>
                            <select
                                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                value={role}
                                onChange={(e) => {
                                    setRole(e.target.value);
                                    setAddonData(null);
                                }}
                                disabled={loading}>
                                <option value="any">All Addons</option>
                                <option value="killer">Killer Addons</option>
                                <option value="survivor">
                                    Survivor Addons
                                </option>
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
                                    onClick={fetchAddons}
                                    disabled={
                                        loading ||
                                        selectedCharacters.length === 0
                                    }>
                                    Start Addon Quiz
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
                                {characterList.map((name) => (
                                    <label
                                        key={name}
                                        className="flex items-center gap-2 py-1 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedCharacters.includes(
                                                name
                                            )}
                                            onChange={() =>
                                                handleCheckbox(name)
                                            }
                                            className="accent-indigo-500"
                                            disabled={loading}
                                        />
                                        <span className="text-sm">{name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    {addonData ? (
                        <div
                            className="w-1/2 bg-gray-900/90 rounded-xl shadow-2xl p-8 mt-4 border border-gray-700 relative overflow-x-hidden overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-600 scrollbar-track-gray-900 scrollbar-thumb-rounded-full scrollbar-track-rounded-full"
                            style={{
                                maxHeight: "850px",
                                scrollbarColor: "#4f46e5 #1a202c",
                                scrollbarWidth: "thin"
                            }}>
                            {addonData && (
                                <>
                                    {addonData.killer &&
                                        addonData.killer.icon && (
                                            <img
                                                src={addonData.killer.icon}
                                                alt={addonData.killer.name}
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
                                        {role === "killer"
                                            ? "Killer Addon:"
                                            : "Survivor Addon"}
                                        <br />
                                        <span className="text-4xl text-gray-100 font-black underline decoration-indigo-400 underline-offset-4 drop-shadow-lg">
                                            {selectedAddonName === null ? (
                                                role === "killer" &&
                                                addonData.killer.name
                                            ) : isCorrect ? (
                                                <button
                                                    className="w-full bg-green-600 hover:bg-green-700 transition-colors px-5 py-2 rounded-lg font-semibold shadow focus:outline-none focus:ring-2 focus:ring-green-400 mt-4"
                                                    onClick={fetchAddons}
                                                    disabled={
                                                        loading ||
                                                        selectedCharacters.length ===
                                                            0
                                                    }>
                                                    Correct: Go Again!
                                                </button>
                                            ) : (
                                                <button
                                                    className="w-full bg-indigo-700 hover:bg-indigo-600 transition-colors px-5 py-2 rounded-lg font-semibold shadow focus:outline-none focus:ring-2 focus:ring-indigo-400 mt-4"
                                                    onClick={fetchAddons}
                                                    disabled={
                                                        loading ||
                                                        selectedCharacters.length ===
                                                            0
                                                    }>
                                                    Incorrect: Try again
                                                </button>
                                            )}
                                        </span>
                                    </h2>
                                    <div className="mb-6 relative z-10">
                                        <h3 className="font-bold text-3xl mb-2 text-indigo-300 tracking-tight">
                                            Addon Details:
                                        </h3>
                                        <ul className="list-disc ml-6 space-y-2">
                                            {
                                                <li
                                                    key={"chosenAddon"}
                                                    className="flex items-start gap-3">
                                                    {addonData.chosen_addon
                                                        .icon && (
                                                        <img
                                                            src={
                                                                addonData
                                                                    .chosen_addon
                                                                    .icon
                                                            }
                                                            alt={
                                                                addonData
                                                                    .chosen_addon
                                                                    .name
                                                            }
                                                            className="w-20 h-20 rounded shadow border border-gray-700 bg-gray-800 object-contain"
                                                            style={{
                                                                marginTop: 6
                                                            }}
                                                        />
                                                    )}
                                                    <div>
                                                        <span className="font-black text-lg text-indigo-200 italic underline decoration-pink-400 underline-offset-4 drop-shadow">
                                                            {
                                                                addonData
                                                                    .chosen_addon
                                                                    .name
                                                            }
                                                        </span>
                                                        {/* Only show the first line of the description */}
                                                        <div
                                                            className="text-sm text-gray-400 whitespace-pre-line"
                                                            dangerouslySetInnerHTML={{
                                                                __html: normaliseDescription(
                                                                    addonData
                                                                        .chosen_addon
                                                                        .description,
                                                                    true
                                                                )
                                                                    .split(
                                                                        "<br"
                                                                    )[0]
                                                                    .split(
                                                                        "<div"
                                                                    )[0]
                                                            }}
                                                        />
                                                    </div>
                                                </li>
                                            }
                                        </ul>
                                    </div>
                                </>
                            )}
                            <div className="relative z-10">
                                <h3 className="font-bold text-3xl mb-2 text-indigo-300 tracking-tight">
                                    Addon Effects:
                                </h3>
                                <ul className="list-disc ml-6 space-y-2">
                                    {addonData.addon_options?.map(
                                        (addon, i) => {
                                            const isSelected =
                                                addon.name ===
                                                selectedAddonName;
                                            const wasCorrect =
                                                addon.name ===
                                                addonData.chosen_addon.name;

                                            let bgClass =
                                                "bg-gray-900 hover:bg-gray-700";
                                            if (selectedAddonName !== null) {
                                                if (wasCorrect)
                                                    bgClass =
                                                        "bg-green-700 hover:bg-green-700";
                                                else if (isSelected)
                                                    bgClass =
                                                        "bg-red-700 hover:bg-red-700";
                                            }

                                            return (
                                                <li
                                                    key={i}
                                                    className="flex items-start gap-3">
                                                    {selectedAddonName !==
                                                    null ? (
                                                        addon.icon && (
                                                            <img
                                                                src={addon.icon}
                                                                alt={addon.name}
                                                                className="w-20 h-20 rounded shadow border border-gray-700 bg-gray-800 object-contain"
                                                                style={{
                                                                    marginTop: 6
                                                                }}
                                                            />
                                                        )
                                                    ) : (
                                                        <img
                                                            src={
                                                                "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/e/e5/Unknown_QuestionMark.png"
                                                            }
                                                            alt={addon.name}
                                                            className="w-20 h-20 rounded shadow border border-gray-700 bg-gray-800 object-contain"
                                                            style={{
                                                                marginTop: 6
                                                            }}
                                                        />
                                                    )}
                                                    <button
                                                        onClick={() =>
                                                            handleAddonClick(
                                                                addon
                                                            )
                                                        }
                                                        disabled={
                                                            selectedAddonName !==
                                                            null
                                                        }
                                                        className={`flex text-left items-start gap-3 w-full rounded cursor-pointer border-none p-3 ${bgClass}`}>
                                                        <div>
                                                            <h3 className="font-bold text-xl mb-2 text-indigo-200 italic underline decoration-pink-400 decoration-0 underline-offset-4 drop-shadow">
                                                                {selectedAddonName ===
                                                                null
                                                                    ? `Addon ${
                                                                          i + 1
                                                                      }`
                                                                    : addon.name}
                                                            </h3>
                                                            <div
                                                                className="text-sm text-gray-400 whitespace-pre-line"
                                                                dangerouslySetInnerHTML={{
                                                                    __html:
                                                                        selectedAddonName ===
                                                                        null
                                                                            ? normaliseDescription(
                                                                                  addon.description,
                                                                                  false
                                                                              ).replace(
                                                                                  new RegExp(
                                                                                      '^(.*?)<div style="height:0.5em">'
                                                                                  ),
                                                                                  ""
                                                                              )
                                                                            : normaliseDescription(
                                                                                  addon.description,
                                                                                  false
                                                                              )
                                                                }}
                                                            />
                                                        </div>
                                                    </button>
                                                </li>
                                            );
                                        }
                                    )}
                                </ul>
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
                </div>
            </div>
        </div>
    );
}

export default AddonMinigame;
