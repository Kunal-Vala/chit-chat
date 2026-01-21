import type { UserProfile } from "../types";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { set } from "zod";
import { searchUsers } from "../api/userApi";

function SearchUsers() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [requestSent, setRequestSent] = useState<Set<string>>(new Set())


  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim()) {
        try {
          setLoading(true);
          const data = await searchUsers(query, 20);
          setResults(data.users);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Search failed");
        } finally {
          setLoading(false);
        }
      } else {
        setResults([])
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);


  return(
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Search Users</h1>

    </div>
  )















}




export default SearchUsers;
