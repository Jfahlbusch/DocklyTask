import TaskChat from '@/components/shared/TaskChat'

interface TaskCustomerChatProps {
  taskId: string
  taskTitle: string
  className?: string
}

export default function TaskCustomerChat(props: TaskCustomerChatProps) {
  return (
    <TaskChat
      {...props}
      mode="customer"
      restrictToStaffOverride={false}
    />
  )
}


