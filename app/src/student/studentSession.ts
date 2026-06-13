export const STUDENT_REG_KEY = 'jbs_student_reg';
export const STUDENT_PIN_KEY = 'jbs_student_pin';

export function getStudentReg(): string {
  return sessionStorage.getItem(STUDENT_REG_KEY) ?? '';
}

export function getStudentPin(): string {
  return sessionStorage.getItem(STUDENT_PIN_KEY) ?? '';
}

export function setStudentSession(registrationNumber: string, pin: string): void {
  sessionStorage.setItem(STUDENT_REG_KEY, registrationNumber);
  sessionStorage.setItem(STUDENT_PIN_KEY, pin);
}

export function clearStudentSession(): void {
  sessionStorage.removeItem(STUDENT_REG_KEY);
  sessionStorage.removeItem(STUDENT_PIN_KEY);
}

export function studentAuthBody(registrationNumber: string, pin?: string): Record<string, string> {
  return {
    registration_number: registrationNumber,
    pin: pin ?? getStudentPin(),
  };
}
