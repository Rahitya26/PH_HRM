import { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const BranchContext = createContext();

export function BranchProvider({ children }) {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBranches = async () => {
    try {
      const res = await axios.get('/api/branches');
      setBranches(res.data);
      if (res.data.length > 0) {
        const saved = localStorage.getItem('selectedBranch');
        if (saved && res.data.find(b => b.id == saved)) {
          setSelectedBranch(Number(saved));
        } else {
          setSelectedBranch(res.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const changeBranch = (id) => {
    const numId = Number(id);
    setSelectedBranch(numId);
    localStorage.setItem('selectedBranch', numId);
  };

  return (
    <BranchContext.Provider value={{ branches, selectedBranch, changeBranch, fetchBranches, isLoading }}>
      {children}
    </BranchContext.Provider>
  );
}
