import { useEffect, useState, useRef } from "react";

function PerkSearch({ role, value, onChange, onSelect }) {
    const [allPerks, setAllPerks] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const containerRef = useRef(null);

    const API_BASE = "http://localhost:5000/api";

    // Fetch all perks on role change
    useEffect(() => {
        async function fetchPerks() {
            const res = await fetch(`${API_BASE}/all_perks?role=any`);
            const data = await res.json();
            setAllPerks(data.perks);
            setShowDropdown(false);
            setHighlightIndex(-1);
        }
        fetchPerks();
    }, [role]);

    // Filter perks when search value changes
    useEffect(() => {
        if (!value || !value.trim()) {
            setFiltered([]);
            setShowDropdown(false);
            setHighlightIndex(-1);
            return;
        }
        const filteredPerks = allPerks.filter(
            (perk) =>
                perk.name.toLowerCase().includes(value.toLowerCase()) ||
                perk.owner?.toLowerCase().includes(value.toLowerCase())
        );
        setFiltered(filteredPerks);
        setShowDropdown(filteredPerks.length > 0);
        setHighlightIndex(-1);
    }, [value, allPerks]);

    // Close dropdown on outside click
    useEffect(() => {
        function onClickOutside(e) {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target)
            ) {
                setShowDropdown(false);
                setHighlightIndex(-1);
            }
        }
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, []);

    function handleSelect(perk) {
        onChange(perk.name);
        setShowDropdown(false);
        setHighlightIndex(-1);
        onSelect(perk);
    }

    function handleKeyDown(e) {
        if (e.key === "Enter") {
            e.preventDefault();
            if (showDropdown && filtered.length > 0) {
                const indexToCommit =
                    highlightIndex === -1 ? 0 : highlightIndex;
                const perkToCommit = filtered[indexToCommit];
                onChange(perkToCommit.name);
                setShowDropdown(false);
                setHighlightIndex(-1);
                onSelect(perkToCommit);
            } else {
                setShowDropdown(false);
                setHighlightIndex(-1);
                onSelect({ name: value });
            }
        }
        if (e.key === "Tab" && showDropdown && filtered.length > 0) {
            e.preventDefault();
            const nextIndex = (highlightIndex + 1) % filtered.length;
            setHighlightIndex(nextIndex);
        }
    }

    return (
        <div className="relative w-full" ref={containerRef}>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() =>
                    value && filtered.length > 0 && setShowDropdown(true)
                }
                onKeyDown={handleKeyDown}
                placeholder="Search and select a perk..."
                className="w-full px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
                autoComplete="off"
            />
            {showDropdown && (
                <ul className="absolute z-30 w-full max-h-60 overflow-auto bg-gray-900 border border-gray-700 rounded-lg shadow-lg scrollbar-thin scrollbar-thumb-indigo-600 scrollbar-track-gray-900">
                    {filtered.map((perk, idx) => (
                        <li
                            key={perk.name}
                            onClick={() => handleSelect(perk)}
                            onMouseDown={(e) => e.preventDefault()}
                            className={`cursor-pointer px-4 py-2 hover:bg-indigo-600 hover:text-white ${
                                idx === highlightIndex ? "bg-indigo-700" : ""
                            }`}>
                            {perk.name}{" "}
                            <span className="text-xs text-gray-400">
                                {perk.owner
                                    ? `${
                                          perk.role[0].toUpperCase() +
                                          perk.role.slice(1)
                                      } - ${perk.owner}`
                                    : perk.role[0].toUpperCase() +
                                      perk.role.slice(1)}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default PerkSearch;
