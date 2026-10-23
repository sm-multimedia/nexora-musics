import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { FiSearch } from 'react-icons/fi';

const DEBOUNCE_MS = 350;

const Searchbar = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const goToResults = (term, replace) => {
    const trimmed = term.trim();

    if (trimmed) navigate(`/search/${encodeURIComponent(trimmed)}`, { replace });
    else navigate('/', { replace });
  };

  const handleChange = (e) => {
    const { value } = e.target;
    setSearchTerm(value);

    clearTimeout(timer.current);
    timer.current = setTimeout(() => goToResults(value, true), DEBOUNCE_MS);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    clearTimeout(timer.current);
    if (searchTerm.trim()) goToResults(searchTerm, false);
  };

  return (
    <form onSubmit={handleSubmit} autoComplete="off" className="p-2 pr-14 md:pr-2 text-gray-400 focus-within:text-gray-200 md:focus-within:text-gray-600">
      <label htmlFor="search-field" className="sr-only">
        Search all files
      </label>
      <div className="flex flex-row justify-start items-center bg-white/10 md:bg-transparent rounded-full md:rounded-none">
        <FiSearch aria-hidden="true" className="w-5 h-5 ml-4" />
        <input
          name="search-field"
          autoComplete="off"
          id="search-field"
          className="flex-1 bg-transparent border-none placeholder-gray-500 outline-none text-base text-white p-3 md:p-4 min-w-0"
          placeholder="Search"
          type="search"
          value={searchTerm}
          onChange={handleChange}
        />
      </div>
    </form>
  );
};

export default Searchbar;
