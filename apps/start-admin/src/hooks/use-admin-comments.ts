import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminKeys } from '@/lib/api/query-keys'
import {
  getPendingCommentsFn,
  moderateCommentFn,
  deleteCommentFn,
} from '../server/comments'

export function useAdminComments() {
  return useQuery({
    queryKey: adminKeys.comments.list(),
    queryFn: () => getPendingCommentsFn(),
  })
}

interface ModerateCommentParams {
  readonly compositeId: string
  readonly action: 'approve' | 'reject'
}

export function useModerateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ compositeId, action }: ModerateCommentParams) => {
      return moderateCommentFn({ data: { id: compositeId, status: action } })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.comments.all })
    },
  })
}

export function useDeleteComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (compositeId: string) => deleteCommentFn({ data: compositeId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.comments.all })
    },
  })
}
