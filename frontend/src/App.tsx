import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [apiStatus, setApiStatus] = useState<string>('Loading...')

  useEffect(() => {
    const fetchApiStatus = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        const response = await fetch(`${apiUrl}/api/health`)
        if (response.ok) {
          setApiStatus('✅ API Connected')
        } else {
          setApiStatus('❌ API Error')
        }
      } catch (error) {
        setApiStatus(`❌ API Error: ${(error as Error).message}`)
      }
    }

    fetchApiStatus()
  }, [])

  return (
    <>
      <div>
        <h1>Vite + React Starter</h1>
        <p>API Status: {apiStatus}</p>
      </div>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
    </>
  )
}

export default App
