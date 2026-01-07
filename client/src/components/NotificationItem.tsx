import { Trash2, CheckCircle, AlertTriangle, Share2 } from 'lucide-react';

type NotificationType = 'exam_completed' | 'exam_blocked' | 'exam_shared';

interface BaseNotification {
  id: number;
  type: NotificationType;
  read: boolean;
  time: string;
}

interface ExamCompletedNotification extends BaseNotification {
  type: 'exam_completed';
  studentName: string;
  examName: string;
  score: number;
}

interface ExamBlockedNotification extends BaseNotification {
  type: 'exam_blocked';
  studentName: string;
  examName: string;
  reason: string;
}

interface ExamSharedNotification extends BaseNotification {
  type: 'exam_shared';
  professorName: string;
  examName: string;
  examId: string;
}

type Notification = ExamCompletedNotification | ExamBlockedNotification | ExamSharedNotification;

interface NotificationItemProps {
  notification: Notification;
  darkMode: boolean;
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
  onAcceptExam: (id: number, examId: string) => void;
}

export default function NotificationItem({ 
  notification,
  darkMode,
  onMarkAsRead,
  onDelete,
  onAcceptExam
}: NotificationItemProps) {
  
  const getNotificationContent = () => {
    switch (notification.type) {
      case 'exam_completed':
        return {
          icon: CheckCircle,
          color: 'bg-green-500',
          bgColor: darkMode ? 'bg-green-900/20' : 'bg-green-50/50',
          title: 'Examen completado',
          message: `${notification.studentName} ha completado el examen de ${notification.examName} con una calificación de ${notification.score}%`
        };
      
      case 'exam_blocked':
        return {
          icon: AlertTriangle,
          color: 'bg-red-500',
          bgColor: darkMode ? 'bg-red-900/20' : 'bg-red-50/50',
          title: 'Alerta de seguridad',
          message: `${notification.studentName} - El sistema bloqueó el examen de ${notification.examName} por: ${notification.reason}`
        };
      
      case 'exam_shared':
        return {
          icon: Share2,
          color: 'bg-blue-500',
          bgColor: darkMode ? 'bg-blue-900/20' : 'bg-blue-50/50',
          title: 'Examen compartido',
          message: `${notification.professorName} te ha compartido el examen "${notification.examName}"`
        };
    }
  };

  const { icon: Icon, color, bgColor, title, message } = getNotificationContent();

  const handleNotificationClick = () => {
    // Marcar automáticamente como leída cuando se hace clic en la notificación
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  const handleAcceptClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.type === 'exam_shared') {
      onAcceptExam(notification.id, notification.examId);
    }
  };

  return (
    <div 
      onClick={handleNotificationClick}
      className={`py-4 border-b last:border-b-0 ${darkMode ? 'border-slate-700' : 'border-gray-200'} ${
        !notification.read ? bgColor : ''
      } px-4 -mx-4 rounded-lg transition-all relative group cursor-pointer hover:${darkMode ? 'bg-slate-800/50' : 'bg-gray-50'}`}
    >
      <div className="flex items-start gap-3">
        <div className={`${color} p-1.5 rounded-lg flex-shrink-0 mt-0.5`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'} ${!notification.read ? 'font-semibold' : ''}`}>
                  {title}
                </h3>
                {!notification.read && (
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${darkMode ? 'bg-teal-500' : 'bg-teal-600'}`}></span>
                )}
              </div>
            </div>
            
            {/* Botón eliminar */}
            <button
              onClick={handleDeleteClick}
              className={`opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md ${
                darkMode ? 'hover:bg-slate-700 text-gray-400 hover:text-red-400' : 'hover:bg-gray-200 text-gray-500 hover:text-red-500'
              }`}
              title="Eliminar notificación"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {message}
          </p>

          {/* Botón para aceptar examen compartido */}
          {notification.type === 'exam_shared' && (
            <div className="mt-3">
              <button
                onClick={handleAcceptClick}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-teal-600 hover:bg-teal-700 text-white' 
                    : 'bg-teal-600 hover:bg-teal-700 text-white'
                }`}
              >
                Aceptar examen
              </button>
            </div>
          )}
          
          <div className="flex items-center justify-between mt-2">
            <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              {notification.time}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}