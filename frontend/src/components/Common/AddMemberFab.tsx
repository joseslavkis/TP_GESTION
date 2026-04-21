import { Plus } from "lucide-react";

interface AddMemberFabProps {
  label?: string;
  onAddMember: () => void;
}

const AddMemberFab: React.FC<AddMemberFabProps> = ({ label, onAddMember }) => {
  return (
    <button
      aria-label={label || "Agregar miembro"}
      onClick={onAddMember}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 ml-[140px] size-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
    >
      <Plus className="size-6" />
    </button>
  );
};

export default AddMemberFab;
