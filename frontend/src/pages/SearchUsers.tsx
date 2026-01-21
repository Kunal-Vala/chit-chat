import type { UserProfile } from "../types";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { searchUsers, sendFriendRequest } from "../api/userApi";

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


  const handleAddFriend = async (userId : string) => {
    try{
      await sendFriendRequest(userId)
      setRequestSent(prev => new Set(prev).add(userId))
    }catch(err){
      setError(err instanceof Error ? err.message : "Failed to send friend request");
    }
  }


  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Search Users</h1>


      {/* SEARCH INPUT */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search By Username..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg"
        />
      </div>

      {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>}

      {loading && <div className="mb-4 p-4 text-center py-8 bg-blue-100 text-blue-700 rounded">Searching...</div>}


      {/* SEARCH RESULTS */}

      <div className="grid gap-4">
        {results.length > 0 ? (
          results.map(user => (
            <div key={user._id} className="bg-white rounded-lg shadow-md p-6 flex items-center justify-between hover:shadow-lg transition">
              <div
                className="flex items-center gap-4 cursor-pointer flex-1"
                onClick={() => navigate(`/users/${user._id}`)}
              >
                {user.profilePictureUrl ? (
                  <img src={user.profilePictureUrl} alt={user.username} className="w-18 h-18 border-2 border-black-300 rounded-full object-cover" />
                ) : (
                  <div className="w-18 h-18 border-2 border-black-300 rounded-full bg-gray-300 flex items-center justify-center">
                    <span>{user.username?.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <div>

                </div>
                <div>

                  <h3 className="text-lg font-semibold">{user.username}</h3>
                  <p className="text-gray-500 text-sm">{user.email}</p>
                  {user.statusText && <p className="text-gray-600 text-sm italic">{user.statusText}</p>}
                </div>
              </div>

              <button
                onClick={() => handleAddFriend(user._id)}
                disabled={requestSent.has(user._id)}
                className={`px-4 py-2 rounded whitespace-nowrap ml-4 ${requestSent.has(user._id)
                    ? 'bg-gray-400 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
              >
                {requestSent.has(user._id) ? 'Request Sent' : 'Add Friend'}
              </button>
            </div>
          ))
        ): query && !loading ? (
          <div className="text-center py-8 text-gray-500">No users found</div>
        ) : null}
      </div>
    </div>
  )





}




export default SearchUsers;
