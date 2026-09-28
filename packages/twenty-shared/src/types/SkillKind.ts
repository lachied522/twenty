export const SKILL_KINDS = ['SYSTEM', 'WORKSPACE', 'USER', 'GIZMO'] as const;

export type SkillKind = (typeof SKILL_KINDS)[number];
