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

function RandomBuild() {
    const [loading, setLoading] = useState(false);
    const [build, setBuild] = useState(null);
    const [error, setError] = useState("");
    const [role, setRole] = useState("any");
    const [updateMsg, setUpdateMsg] = useState("");
    const [characterList, setCharacterList] = useState([]);
    const [selectedCharacters, setSelectedCharacters] = useState([]);
    const [useOfferings, setUseOfferings] = useState(false);
    const [manualMode, setManualMode] = useState(false);
    const [allCharacters, setAllCharacters] = useState([]);
    const [allAddons, setAllAddons] = useState([]);
    const [allPerks, setAllPerks] = useState([]);
    const [manualBuild, setManualBuild] = useState({
        killer: "",
        survivor: "",
        addons: [],
        perks: []
    });
    const [addonSearch, setAddonSearch] = useState("");
    const [perkSearch, setPerkSearch] = useState("");

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

    // Fetch all characters, addons, and perks for manual build
    useEffect(() => {
        if (!manualMode) return;
        fetch(`${API_BASE}/characters?role=${role}`)
            .then((res) => res.json())
            .then((data) => setAllCharacters(data.characters || []));
        if (role === "killer") {
            fetch(`${API_BASE}/all_addons`)
                .then((res) => res.json())
                .then((data) => setAllAddons(data.addons || []));
            fetch(`${API_BASE}/all_perks?role=killer`)
                .then((res) => res.json())
                .then((data) => setAllPerks(data.perks || []));
        } else {
            setAllAddons([]);
            fetch(`${API_BASE}/all_perks?role=survivor`)
                .then((res) => res.json())
                .then((data) => setAllPerks(data.perks || []));
        }
    }, [manualMode, role]);

    const fetchBuild = async () => {
        setLoading(true);
        setError("");
        setBuild(null);
        try {
            const res = await fetch(`${API_BASE}/random_build?role=${role}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    allowed: selectedCharacters,
                    useOfferings: useOfferings
                })
            });
            if (!res.ok) throw new Error("Failed to fetch build");
            const data = await res.json();
            setBuild(data);
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

    const selectAll = () => setSelectedCharacters(characterList);
    const deselectAll = () => setSelectedCharacters([]);

    // Helper for manual build change
    const handleManualChange = (field, value) => {
        setManualBuild((prev) => ({
            ...prev,
            [field]: value
        }));
    };

    // Manual build: handle checkbox for perks/addons
    const handleManualCheckbox = (field, value, max) => {
        setManualBuild((prev) => {
            let arr = prev[field];
            if (arr.includes(value)) {
                arr = arr.filter((v) => v !== value);
            } else if (arr.length < max) {
                arr = [...arr, value];
            }
            return { ...prev, [field]: arr };
        });
    };

    return (
        <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 flex flex-col overflow-hidden">
            <Link
                to="/"
                className="text-indigo-400 hover:text-indigo-300 absolute font-medium text-sm mt-8 ml-4 z-20">
                ← Back to Home
            </Link>
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <h1 className="text-5xl font-extrabold my-4 text-indigo-400 drop-shadow-lg tracking-tight text-center">
                    DbD Random Build Generator
                </h1>
                <div className="flex flex-row items-start flex-1 mx-auto w-full gap-4 px-4 pb-4 overflow-hidden min-h-0">
                    <div className="w-1/4 bg-gray-900/90 rounded-xl shadow-2xl p-8 border border-gray-700 flex flex-col items-start text-left h-full overflow-hidden">
                        <h2 className="text-2xl font-bold mb-4 text-indigo-300">
                            Settings
                        </h2>
                        <div className="mb-4 w-full">
                            <label className="block mb-2 font-semibold">
                                Role:
                            </label>
                            <select
                                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                value={role}
                                onChange={(e) => {
                                    setRole(e.target.value);
                                    setBuild(null);
                                }}
                                disabled={loading}>
                                <option value="any">Killer or Survivor</option>
                                <option value="killer">Killer</option>
                                <option value="survivor">Survivor</option>
                            </select>
                            <div className="flex flex-row items-start gap-2 w-full">
                                <button
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 transition-colors px-2 py-2 rounded-lg font-semibold shadow focus:outline-none focus:ring-2 focus:ring-indigo-400 mt-4 text-xs"
                                    onClick={updateDatabase}
                                    disabled={loading}>
                                    Reinitialise Database
                                </button>
                                <button
                                    className="w-full bg-green-600 hover:bg-green-700 transition-colors px-2 py-2 rounded-lg font-semibold shadow focus:outline-none focus:ring-2 focus:ring-green-400 mt-4 text-xs"
                                    onClick={fetchBuild}
                                    disabled={
                                        loading ||
                                        selectedCharacters.length === 0
                                    }>
                                    Create Random Build
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
                        <div className="mb-4 w-full flex flex-col flex-1 overflow-hidden">
                            <div className="flex gap-4 mb-2">
                                <div className="flex items-center gap-2">
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
                                <div className="flex items-center gap-1">
                                    <input
                                        type="checkbox"
                                        checked={useOfferings}
                                        onChange={(e) =>
                                            setUseOfferings(e.target.checked)
                                        }
                                        className="accent-indigo-500"
                                        disabled={loading}
                                    />
                                    <label className="text-xs font-semibold text-gray-300">
                                        Use Offerings
                                    </label>
                                </div>
                            </div>
                            <div
                                className="overflow-y-scroll flex-1 min-h-0 border border-gray-800 rounded-md p-2 bg-gray-800/60 scrollbar-thin scrollbar-thumb-indigo-600 scrollbar-track-gray-900 scrollbar-thumb-rounded-full scrollbar-track-rounded-full"
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
                    {build ? (
                        <div
                            className="w-1/2 bg-gray-900/90 rounded-xl shadow-2xl p-8 border border-gray-700 relative overflow-x-hidden overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-600 scrollbar-track-gray-900 scrollbar-thumb-rounded-full scrollbar-track-rounded-full h-full"
                            style={{
                                scrollbarColor: "#4f46e5 #1a202c",
                                scrollbarWidth: "thin"
                            }}>
                            {build.killer && (
                                <>
                                    {build.killer.icon && (
                                        <img
                                            src={build.killer.icon}
                                            alt={build.killer.name}
                                            className="absolute opacity-15 pointer-events-none select-none"
                                            style={{
                                                top: "50%",
                                                left: "50%",
                                                transform:
                                                    "translate(-50%, -50%) scale(6)",
                                                zIndex: 0,
                                                filter: "blur(1px)"
                                            }}
                                        />
                                    )}
                                    <h2 className="text-3xl font-extrabold mb-4 text-pink-400 tracking-wide drop-shadow relative z-10">
                                        Killer Build:
                                        <br />
                                        <span className="text-4xl text-gray-100 font-black underline decoration-indigo-400 underline-offset-4 drop-shadow-lg">
                                            {build.killer.name}
                                        </span>
                                    </h2>
                                    {build.offering && (
                                        <div className="mb-6 relative z-10">
                                            <h3 className="font-bold text-3xl mb-2 text-indigo-300 tracking-tight">
                                                Offering:
                                            </h3>
                                            <ul className="list-disc ml-6 space-y-2">
                                                <li className="flex items-start gap-3">
                                                    {build.offering.icon && (
                                                        <img
                                                            src={
                                                                build.offering
                                                                    .icon
                                                            }
                                                            alt={
                                                                build.offering
                                                                    .name
                                                            }
                                                            className="w-20 h-20 rounded shadow border border-gray-700 bg-gray-800 object-contain"
                                                            style={{
                                                                marginTop: 6
                                                            }}
                                                        />
                                                    )}
                                                    <div>
                                                        <span
                                                            className="font-black text-lg text-indigo-200 italic underline decoration-2 underline-offset-4 drop-shadow"
                                                            style={{
                                                                textDecorationColor:
                                                                    build
                                                                        .offering
                                                                        .color
                                                            }}>
                                                            {
                                                                build.offering
                                                                    .name
                                                            }{" "}
                                                            (
                                                            {
                                                                build.offering
                                                                    .rarity
                                                            }
                                                            )
                                                        </span>
                                                        <div
                                                            className="text-sm text-gray-400 whitespace-pre-line"
                                                            dangerouslySetInnerHTML={{
                                                                __html: normaliseDescription(
                                                                    build
                                                                        .offering
                                                                        .description,
                                                                    true
                                                                )
                                                            }}
                                                        />
                                                    </div>
                                                </li>
                                            </ul>
                                        </div>
                                    )}
                                    <div className="mb-6 relative z-10">
                                        <h3 className="font-bold text-3xl mb-2 text-indigo-300 tracking-tight">
                                            Add-ons:
                                        </h3>
                                        {!build.addons ? (
                                            <p className="text-gray-400">
                                                No add-ons found. This can be
                                                due to a killer being new and
                                                not having any add-ons in the
                                                wiki yet. Additionally, it may
                                                be possible that there is
                                                missing data in the database, to
                                                re-initialising it may help.
                                            </p>
                                        ) : (
                                            <ul className="list-disc ml-6 space-y-2">
                                                {build.addons?.map(
                                                    (addon, i) => (
                                                        <li
                                                            key={i}
                                                            className="flex items-start gap-3">
                                                            {addon.icon && (
                                                                <img
                                                                    src={
                                                                        addon.icon
                                                                    }
                                                                    alt={
                                                                        addon.name
                                                                    }
                                                                    className="w-20 h-20 rounded shadow border border-gray-700 bg-gray-800 object-contain"
                                                                    style={{
                                                                        marginTop: 6
                                                                    }}
                                                                />
                                                            )}
                                                            <div>
                                                                <span
                                                                    className="font-black text-lg text-indigo-200 italic underline underline-offset-4 drop-shadow decoration-2"
                                                                    style={{
                                                                        textDecorationColor:
                                                                            addon.color
                                                                    }}>
                                                                    {addon.name}{" "}
                                                                    (
                                                                    {
                                                                        addon.rarity
                                                                    }
                                                                    )
                                                                </span>
                                                                <div
                                                                    className="text-sm text-gray-400 whitespace-pre-line"
                                                                    dangerouslySetInnerHTML={{
                                                                        __html: normaliseDescription(
                                                                            addon.description,
                                                                            true
                                                                        )
                                                                    }}
                                                                />
                                                            </div>
                                                        </li>
                                                    )
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                </>
                            )}
                            {build.survivor && (
                                <>
                                    <h2 className="text-3xl font-extrabold mb-4 text-pink-400 tracking-wide drop-shadow z-10">
                                        Survivor Build:
                                        <br />
                                        <span className="text-4xl text-gray-100 font-black underline decoration-indigo-400 underline-offset-4 drop-shadow-lg">
                                            {build.survivor.name}
                                        </span>
                                    </h2>
                                    {build.offering && (
                                        <div className="mb-6 relative z-10">
                                            <h3 className="font-bold text-3xl mb-2 text-indigo-300 tracking-tight">
                                                Offering:
                                            </h3>
                                            <ul className="list-disc ml-6 space-y-2">
                                                <li className="flex items-start gap-3">
                                                    {build.offering.icon && (
                                                        <img
                                                            src={
                                                                build.offering
                                                                    .icon
                                                            }
                                                            alt={
                                                                build.offering
                                                                    .name
                                                            }
                                                            className="w-20 h-20 rounded shadow border border-gray-700 bg-gray-800 object-contain"
                                                            style={{
                                                                marginTop: 6
                                                            }}
                                                        />
                                                    )}
                                                    <div>
                                                        <span
                                                            className="font-black text-lg text-indigo-200 italic underline underline-offset-4 drop-shadow"
                                                            style={{
                                                                textDecorationColor:
                                                                    build
                                                                        .offering
                                                                        .color
                                                            }}>
                                                            {
                                                                build.offering
                                                                    .name
                                                            }{" "}
                                                            (
                                                            {
                                                                build.offering
                                                                    .rarity
                                                            }
                                                            )
                                                        </span>
                                                        <div
                                                            className="text-sm text-gray-400 whitespace-pre-line"
                                                            dangerouslySetInnerHTML={{
                                                                __html: normaliseDescription(
                                                                    build
                                                                        .offering
                                                                        .description,
                                                                    true
                                                                )
                                                            }}
                                                        />
                                                    </div>
                                                </li>
                                            </ul>
                                        </div>
                                    )}
                                    {build.item && (
                                        <div className="mb-6 relative z-10">
                                            <h3 className="font-bold text-3xl mb-2 text-indigo-300 tracking-tight">
                                                Item:
                                            </h3>
                                            <ul className="list-disc ml-6 space-y-2">
                                                <li className="flex items-start gap-3">
                                                    {build.item.icon && (
                                                        <img
                                                            src={
                                                                build.item.icon
                                                            }
                                                            alt={
                                                                build.item.name
                                                            }
                                                            className="w-20 h-20 rounded shadow border border-gray-700 bg-gray-800 object-contain"
                                                            style={{
                                                                marginTop: 6
                                                            }}
                                                        />
                                                    )}
                                                    <div>
                                                        <span className="font-black text-lg text-indigo-200 italic underline underline-offset-4 drop-shadow decoration-indigo-400 decoration-2">
                                                            {build.item.name}
                                                        </span>
                                                        <div
                                                            className="text-sm text-gray-400 whitespace-pre-line"
                                                            dangerouslySetInnerHTML={{
                                                                __html: normaliseDescription(
                                                                    build.item
                                                                        .description,
                                                                    true
                                                                )
                                                            }}
                                                        />
                                                    </div>
                                                </li>
                                            </ul>
                                            {build.addons.length > 0 && (
                                                <>
                                                    <h3 className="font-bold text-3xl mb-2 text-indigo-300 tracking-tight">
                                                        Add-ons:
                                                    </h3>
                                                    <ul className="list-disc ml-6 space-y-2">
                                                        {build.addons?.map(
                                                            (addon, i) => (
                                                                <li
                                                                    key={i}
                                                                    className="flex items-start gap-3">
                                                                    {addon.icon && (
                                                                        <img
                                                                            src={
                                                                                addon.icon
                                                                            }
                                                                            alt={
                                                                                addon.name
                                                                            }
                                                                            className="w-20 h-20 rounded shadow border border-gray-700 bg-gray-800 object-contain"
                                                                            style={{
                                                                                marginTop: 6
                                                                            }}
                                                                        />
                                                                    )}
                                                                    <div>
                                                                        <span
                                                                            className="font-black text-lg text-indigo-200 italic underline underline-offset-4 drop-shadow decoration-2"
                                                                            style={{
                                                                                textDecorationColor:
                                                                                    addon.color
                                                                            }}>
                                                                            {
                                                                                addon.name
                                                                            }{" "}
                                                                            (
                                                                            {
                                                                                addon.rarity
                                                                            }
                                                                            )
                                                                        </span>
                                                                        <div
                                                                            className="text-sm text-gray-400 whitespace-pre-line"
                                                                            dangerouslySetInnerHTML={{
                                                                                __html: normaliseDescription(
                                                                                    addon.description,
                                                                                    true
                                                                                )
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </li>
                                                            )
                                                        )}
                                                    </ul>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                            <div className="relative z-10">
                                <h3 className="font-bold text-3xl mb-2 text-indigo-300 tracking-tight">
                                    Perks:
                                </h3>
                                <ul className="list-disc ml-6 space-y-2">
                                    {build.perks?.map((perk, i) => (
                                        <li
                                            key={i}
                                            className="flex items-start gap-3">
                                            {perk.icon && (
                                                <img
                                                    src={perk.icon}
                                                    alt={perk.name}
                                                    className="w-20 h-20 rounded shadow border border-gray-700 bg-gray-800 object-contain"
                                                    style={{ marginTop: 6 }}
                                                />
                                            )}
                                            <div>
                                                <span className="font-black text-lg text-indigo-200 italic underline decoration-2 decoration-indigo-400 underline-offset-4 drop-shadow">
                                                    {perk.name}{" "}
                                                    {perk.owner
                                                        ? `(${perk.owner})`
                                                        : ""}
                                                </span>
                                                <div
                                                    className="text-sm text-gray-400 whitespace-pre-line"
                                                    dangerouslySetInnerHTML={{
                                                        __html: normaliseDescription(
                                                            perk.description,
                                                            false
                                                        )
                                                    }}
                                                />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div
                            className="w-1/2 bg-gray-900/90 rounded-xl shadow-2xl p-8 border border-gray-700 relative overflow-x-hidden overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-600 scrollbar-track-gray-900 scrollbar-thumb-rounded-full scrollbar-track-rounded-full h-full"
                            style={{
                                scrollbarColor: "#4f46e5 #1a202c",
                                scrollbarWidth: "thin"
                            }}
                        />
                    )}
                    <div className="w-1/4 bg-gray-900/90 rounded-xl shadow-2xl p-8 border border-gray-700 flex flex-col items-start text-left h-full overflow-hidden">
                        <h2 className="text-2xl font-bold mb-4 text-indigo-300">
                            Import/Export
                        </h2>
                        <p className="text-sm text-gray-400 mb-4">
                            Import or export builds as JSON files below.
                        </p>
                        <div className="flex gap-2 mb-4 w-full">
                            <button
                                className="w-full bg-blue-600 hover:bg-blue-700 transition-colors px-4 py-2 rounded-lg font-semibold shadow focus:outline-none focus:ring-2 focus:ring-blue-400"
                                onClick={() => {
                                    const input =
                                        document.createElement("input");
                                    input.type = "file";
                                    input.accept = ".json,application/json";
                                    input.onchange = (e) => {
                                        const file = e.target.files[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                            try {
                                                const imported = JSON.parse(
                                                    event.target.result
                                                );
                                                setBuild(imported);
                                                alert("Build imported!");
                                            } catch {
                                                alert("Invalid JSON file.");
                                            }
                                        };
                                        reader.readAsText(file);
                                    };
                                    input.click();
                                }}
                                disabled={loading}>
                                Import JSON
                            </button>
                            <button
                                className="w-full bg-green-600 hover:bg-green-700 transition-colors px-4 py-2 rounded-lg font-semibold shadow focus:outline-none focus:ring-2 focus:ring-green-400"
                                onClick={() => {
                                    const blob = new Blob(
                                        [JSON.stringify(build, null, 2)],
                                        { type: "application/json" }
                                    );
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = "dbd_build.json";
                                    a.click();
                                    URL.revokeObjectURL(url);
                                }}
                                disabled={loading}>
                                Export JSON
                            </button>
                        </div>
                        <div className="mb-2 w-full">
                            <button
                                className={`w-full px-4 py-2 rounded-lg font-semibold shadow focus:outline-none focus:ring-2 mt-2 ${
                                    manualMode
                                        ? "bg-indigo-700 text-white"
                                        : "bg-gray-700 text-gray-300"
                                }`}
                                onClick={() => setManualMode((v) => !v)}
                                disabled={loading}>
                                {manualMode
                                    ? "Close Manual Build Editor"
                                    : "Set Build Manually"}
                            </button>
                        </div>
                        {manualMode && (
                            <div className="w-full flex-1 overflow-y-auto">
                                <h3 className="text-lg font-bold mb-2 text-indigo-200">
                                    Manual Build Editor
                                </h3>
                                <div className="mb-2">
                                    <label className="block font-semibold mb-1">
                                        {role === "killer"
                                            ? "Killer"
                                            : "Survivor"}
                                    </label>
                                    <select
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 mb-2"
                                        value={
                                            role === "killer"
                                                ? manualBuild.killer
                                                : manualBuild.survivor
                                        }
                                        onChange={(e) => {
                                            handleManualChange(
                                                role === "killer"
                                                    ? "killer"
                                                    : "survivor",
                                                e.target.value
                                            );
                                            handleManualChange("addons", []);
                                            handleManualChange("perks", []);
                                        }}>
                                        <option value="">Select...</option>
                                        {allCharacters.map((name) => (
                                            <option key={name} value={name}>
                                                {name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {role === "killer" && (
                                    <div className="mb-2">
                                        <label className="block font-semibold mb-1">
                                            Addons (max 2)
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full mb-1 px-2 py-1 rounded bg-gray-800 border border-gray-700 text-sm"
                                            placeholder="Search addons..."
                                            value={addonSearch}
                                            onChange={(e) =>
                                                setAddonSearch(e.target.value)
                                            }
                                        />
                                        <div
                                            className="overflow-y-auto max-h-32 border border-gray-800 rounded-md p-2 bg-gray-800/60 scrollbar-thin"
                                            style={{
                                                scrollbarColor:
                                                    "#4f46e5 #1a202c",
                                                scrollbarWidth: "thin"
                                            }}>
                                            {allAddons
                                                .filter(
                                                    (a) =>
                                                        (!manualBuild.killer ||
                                                            a.killer ===
                                                                manualBuild.killer) &&
                                                        (!addonSearch ||
                                                            a.name
                                                                .toLowerCase()
                                                                .includes(
                                                                    addonSearch.toLowerCase()
                                                                ))
                                                )
                                                .map((addon) => {
                                                    const checked =
                                                        manualBuild.addons.includes(
                                                            addon.name
                                                        );
                                                    const disabled =
                                                        loading ||
                                                        (!checked &&
                                                            manualBuild.addons
                                                                .length >= 2);
                                                    return (
                                                        <label
                                                            key={addon.name}
                                                            className={`flex items-center gap-2 py-1 cursor-pointer ${
                                                                disabled
                                                                    ? "opacity-60"
                                                                    : ""
                                                            }`}>
                                                            <input
                                                                type="checkbox"
                                                                checked={
                                                                    checked
                                                                }
                                                                onChange={() =>
                                                                    handleManualCheckbox(
                                                                        "addons",
                                                                        addon.name,
                                                                        2
                                                                    )
                                                                }
                                                                className="accent-indigo-500"
                                                                disabled={
                                                                    loading
                                                                }
                                                            />
                                                            <span className="text-sm">
                                                                {addon.name}
                                                            </span>
                                                        </label>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                )}
                                <div className="mb-2">
                                    <label className="block font-semibold mb-1">
                                        Perks (max 4)
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full mb-1 px-2 py-1 rounded bg-gray-800 border border-gray-700 text-sm"
                                        placeholder="Search perks..."
                                        value={perkSearch}
                                        onChange={(e) =>
                                            setPerkSearch(e.target.value)
                                        }
                                    />
                                    <div
                                        className="overflow-y-auto max-h-40 border border-gray-800 rounded-md p-2 bg-gray-800/60 scrollbar-thin"
                                        style={{
                                            scrollbarColor: "#4f46e5 #1a202c",
                                            scrollbarWidth: "thin"
                                        }}>
                                        {allPerks
                                            .filter(
                                                (perk) =>
                                                    !perkSearch ||
                                                    perk.name
                                                        .toLowerCase()
                                                        .includes(
                                                            perkSearch.toLowerCase()
                                                        )
                                            )
                                            .map((perk) => {
                                                const checked =
                                                    manualBuild.perks.includes(
                                                        perk.name
                                                    );
                                                const disabled =
                                                    loading ||
                                                    (!checked &&
                                                        manualBuild.perks
                                                            .length >= 4);
                                                return (
                                                    <label
                                                        key={perk.name}
                                                        className={`flex items-center gap-2 py-1 cursor-pointer ${
                                                            disabled
                                                                ? "opacity-60"
                                                                : ""
                                                        }`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() =>
                                                                handleManualCheckbox(
                                                                    "perks",
                                                                    perk.name,
                                                                    4
                                                                )
                                                            }
                                                            className="accent-indigo-500"
                                                            disabled={loading}
                                                        />
                                                        <span className="text-sm">
                                                            {perk.name}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                    </div>
                                </div>
                                <button
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-semibold shadow focus:outline-none focus:ring-2 focus:ring-indigo-400 mt-2"
                                    onClick={() => {
                                        // Compose a build object and show it
                                        let buildObj = {};
                                        if (role === "killer") {
                                            buildObj.killer = {
                                                name: manualBuild.killer,
                                                icon:
                                                    allCharacters.find(
                                                        (c) =>
                                                            c ===
                                                            manualBuild.killer
                                                    )?.icon || ""
                                            };
                                            buildObj.addons = allAddons
                                                .filter((a) =>
                                                    manualBuild.addons.includes(
                                                        a.name
                                                    )
                                                )
                                                .map((a) => ({
                                                    name: a.name,
                                                    description: a.description,
                                                    icon: a.icon
                                                }));
                                        } else {
                                            buildObj.survivor =
                                                manualBuild.survivor;
                                            buildObj.addons = [];
                                        }
                                        buildObj.perks = allPerks
                                            .filter((p) =>
                                                manualBuild.perks.includes(
                                                    p.name
                                                )
                                            )
                                            .map((p) => ({
                                                name: p.name,
                                                description: p.description,
                                                owner: p.owner,
                                                icon: p.icon
                                            }));
                                        setBuild(buildObj);
                                        setManualMode(false);
                                    }}
                                    disabled={
                                        loading ||
                                        (role === "killer"
                                            ? !manualBuild.killer
                                            : !manualBuild.survivor) ||
                                        (role === "killer"
                                            ? manualBuild.addons.length === 0
                                            : false) ||
                                        manualBuild.perks.length === 0
                                    }>
                                    Set Build
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RandomBuild;
