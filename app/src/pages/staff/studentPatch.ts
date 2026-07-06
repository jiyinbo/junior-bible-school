import { apiJson } from '../../api/http';
import type { StudentDetail } from './studentDetailShared';

export async function patchStudent(
  studentId: string,
  json: Record<string, unknown>,
): Promise<StudentDetail> {
  const response = await apiJson<{ data: StudentDetail }>(`/api/v1/admin/registrations/${studentId}`, {
    method: 'PATCH',
    json,
  });

  return response.data;
}

export async function deleteStudent(studentId: string): Promise<void> {
  await apiJson(`/api/v1/admin/registrations/${studentId}`, { method: 'DELETE' });
}

export function emptyToNull(value: string): string | null {
  const trimmed = value.trim();

  return trimmed === '' ? null : trimmed;
}
