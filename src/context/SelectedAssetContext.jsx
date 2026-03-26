import { createContext, useContext, useState } from 'react';

const SelectedAssetContext = createContext(null);

export function SelectedAssetProvider({ children }) {
  const [selectedAsset, setSelectedAsset] = useState(null);
  return (
    <SelectedAssetContext.Provider value={{ selectedAsset, setSelectedAsset }}>
      {children}
    </SelectedAssetContext.Provider>
  );
}

export function useSelectedAsset() {
  return useContext(SelectedAssetContext);
}
