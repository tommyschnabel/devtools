interface CardProps {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}

function Card({ icon, title, description, onClick }: CardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={onClick}>
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 mb-4">{description}</p>
      <button className="text-blue-500 font-medium hover:text-blue-600 transition-colors">
        Open →
      </button>
    </div>
  );
}

export default Card;
