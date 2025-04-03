
interface UseNavigationProps {
  currentDocIndex: number;
  totalDocuments: number;
  setCurrentDocIndex: React.Dispatch<React.SetStateAction<number>>;
  setIsEditingAll: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useNavigation({
  currentDocIndex,
  totalDocuments,
  setCurrentDocIndex,
  setIsEditingAll
}: UseNavigationProps) {
  const handleNext = () => {
    if (currentDocIndex < totalDocuments - 1) {
      setCurrentDocIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentDocIndex > 0) {
      setCurrentDocIndex(prev => prev - 1);
    }
  };

  const toggleEditAll = () => {
    setIsEditingAll(prev => !prev);
  };

  return {
    handleNext,
    handlePrevious,
    toggleEditAll
  };
}
