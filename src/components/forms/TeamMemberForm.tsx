'use client'

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useTeamContext } from '@/hooks/useTeamContext'
import { TeamMember } from '@/lib/types'

const teamMemberSchema = z.object({
  teamId: z.string().min(1, 'Team is required'),
  userId: z.string().min(1, 'User is required'),
  role: z.string().optional(),
})

type TeamMemberFormData = z.infer<typeof teamMemberSchema>

interface TeamMemberFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member?: TeamMember
  teamId?: string
  onSuccess?: () => void
}

export function TeamMemberForm({ 
  open, 
  onOpenChange, 
  member, 
  teamId,
  onSuccess 
}: TeamMemberFormProps) {
  const { addTeamMember, updateTeamMember, state } = useTeamContext()
  const [users, setUsers] = useState<any[]>([])
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  
  const form = useForm<TeamMemberFormData>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      teamId: member?.teamId || teamId || '',
      userId: member?.userId || '',
      role: member?.role || 'member',
    },
  })

  useEffect(() => {
    if (teamId && !member) {
      form.setValue('teamId', teamId)
    }
  }, [teamId, member, form])

  useEffect(() => {
    // Fetch users separately
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users')
        if (response.ok) {
          const usersData = await response.json()
          setUsers(usersData)
          setAvailableUsers(usersData)
        }
      } catch (error) {
        console.error('Error fetching users:', error)
      }
    }
    fetchUsers()
  }, [])

  useEffect(() => {
    // Filter out users who are already members of the selected team
    const selectedTeamId = form.watch('teamId')
    if (selectedTeamId) {
      const existingMemberIds = state.teamMembers
        .filter(tm => tm.teamId === selectedTeamId)
        .map(tm => tm.userId)
      
      setAvailableUsers(users.filter(user => !existingMemberIds.includes(user.id)))
    } else {
      setAvailableUsers(users)
    }
  }, [state.teamMembers, users, form])

  const onSubmit = async (data: TeamMemberFormData) => {
    try {
      if (member) {
        await updateTeamMember(member.id, data)
      } else {
        await addTeamMember(data)
      }
      form.reset()
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Failed to save team member:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {member ? 'Edit Team Member' : 'Add Team Member'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="teamId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a team" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {state.teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="lead">Team Lead</SelectItem>
                      <SelectItem value="admin">Team Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {member ? 'Update Member' : 'Add Member'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}