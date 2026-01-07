interface NotificationItemProps {
  id: number;
  title: string;
  message: string;
  time: string;
  type?: 'info' | 'warning' | 'success' | 'error';
  read?: boolean;
  darkMode: boolean;
  onMarkAsRead?: (id: number) => void;
  onClick?: (id: number) => void;
}

export default function NotificationItem({ 
  id,
  title, 
  message, 
  time, 
  type = 'info',
  read = false,
  darkMode,
  onMarkAsRead,
  onClick
}: NotificationItemProps) {
  const getIconColor = () => {
    switch (type) {
      case 'success': return 'bg-green-500';
      case 'warning': return 'bg-orange-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-teal-500';
    }
  };

  return (
    <div 
      className={`py-4 border-b last:border-b-0 ${darkMode ? 'border-slate-700' : 'border-gray-200'} ${
        !read ? (darkMode ? 'bg-slate-800/50' : 'bg-blue-50/50') : ''
      } px-4 -mx-4 rounded-lg cursor-pointer hover:${darkMode ? 'bg-slate-800' : 'bg-gray-50'} transition-colors`}
      onClick={() => onClick?.(id)}
    >
      <div className="flex items-start gap-3">
        <div className={`w-2 h-2 ${getIconColor()} rounded-full mt-2 flex-shrink-0`}></div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'} ${!read ? 'font-semibold' : ''}`}>
              {title}
            </h3>
            {!read && (
              <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></span>
            )}
          </div>
          
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {message}
          </p>
          
          <div className="flex items-center justify-between mt-2">
            <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              {time}
            </p>
            
            {!read && onMarkAsRead && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(id);
                }}
                className={`text-xs font-medium ${darkMode ? 'text-teal-400 hover:text-teal-300' : 'text-teal-600 hover:text-teal-700'}`}
              >
                Marcar como leída
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}