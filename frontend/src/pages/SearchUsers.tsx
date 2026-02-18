import type { UserProfile } from "../types";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { searchUsers, sendFriendRequest } from "../api/userApi";

function SearchUsers() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState<UserProfile[]>([]);
  const [requestSent, setRequestSent] = useState<Set<string>>(new Set())


  useEffect(() => {
    const nextQuery = searchParams.get('q') ?? ''
    setQuery(nextQuery)
  }, [searchParams])

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
    <div className="app-page">
      <div className="app-card p-6 md:p-8">
        <h1 className="text-3xl font-bold mb-2 font-display">Search Users</h1>
        <p className="app-muted mb-6">Find people and build your inner circle.</p>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by username..."
            value={query}
            onChange={e => {
              const value = e.target.value
              setQuery(value)
              if (value.trim()) {
                setSearchParams({ q: value }, { replace: true })
              } else {
                setSearchParams({}, { replace: true })
              }
            }}
            className="app-input"
          />
        </div>

        {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>}

        {loading && <div className="mb-4 p-4 text-center py-8 app-card-inner">Searching...</div>}

        <div className="grid gap-4">
          {results.length > 0 ? (
            results.map(user => (
              <div key={user._id} className="app-card-inner p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div
                  className="flex items-center gap-4 cursor-pointer flex-1"
                  onClick={() => navigate(`/users/${user._id}`)}
                >
                  {user.profilePictureUrl ? (
                    <img src={user.profilePictureUrl} alt={user.username} className="app-avatar-img lg" />
                  ) : (
                    <div className="app-avatar-img lg flex items-center justify-center">
                      <span className="text-xl font-semibold app-muted">{user.username?.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold">{user.username}</h3>
                    <p className="app-muted text-sm">{user.email}</p>
                    {user.statusText && <p className="app-muted text-sm italic">{user.statusText}</p>}
                  </div>
                </div>

                <button
                  onClick={() => handleAddFriend(user._id)}
                  disabled={requestSent.has(user._id)}
                  className={`app-primary-button whitespace-nowrap ${requestSent.has(user._id)
                      ? 'opacity-60 cursor-not-allowed'
                      : ''
                    }`}
                >
                  {requestSent.has(user._id) ? 'Request Sent' : 'Add Friend'}
                </button>
              </div>
            ))
          ): query && !loading ? (
            <div className="text-center py-8 app-muted">No users found</div>
          ) : null}
        </div>
      </div>
    </div>
  )





}




export default SearchUsers;
