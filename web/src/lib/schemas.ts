import { z } from "zod";

// Tvary odpovedí Python backendu (backend/serializers.py). Odpovede sa validujú na hranici,
// aby zmena kontraktu skončila zrozumiteľnou chybou a nie rozbitým renderom.

export const memberStatusSchema = z.enum(["applicant", "active", "inactive", "blocked"]);
export const ecpRequestStatusSchema = z.enum(["pending", "approved", "rejected"]);

export const memberSchema = z.object({
  id: z.number(),
  status: memberStatusSchema,
  titlePrefix: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  titleSuffix: z.string(),
  email: z.string(),
  phone: z.string(),
  primaryClubId: z.number().nullable(),
  primaryClubName: z.string(),
  isPresident: z.boolean(),
  hasEcp: z.boolean(),
  hasPaidCurrentYearFee: z.boolean(),
  discountedMembership: z.boolean(),
});

export const memberDetailSchema = memberSchema.extend({
  address: z.object({
    street: z.string(),
    city: z.string(),
    zipCode: z.string(),
    country: z.string(),
  }),
  portraitUrl: z.string().nullable(),
  ecpValidUntil: z.string().nullable(),
});

export const clubSchema = z.object({
  id: z.number(),
  name: z.string(),
  street: z.string(),
  city: z.string(),
  zipCode: z.string(),
  country: z.string(),
  email: z.string(),
  phone: z.string(),
  webpage: z.string(),
  presidentName: z.string(),
  memberCount: z.number(),
  foundationDate: z.string().nullable(),
});

export const ecpRequestSchema = z.object({
  id: z.number(),
  memberId: z.number(),
  memberName: z.string(),
  clubName: z.string(),
  status: ecpRequestStatusSchema,
  requestDate: z.string().nullable(),
});

export const notificationSchema = z.object({
  id: z.number(),
  createdAt: z.string().nullable(),
  text: z.string(),
  validFrom: z.string().nullable(),
  validTo: z.string().nullable(),
  status: z.string(),
});

export const notificationListSchema = z.object({ items: z.array(notificationSchema) });

export const statsSchema = z.object({
  year: z.number(),
  memberCount: z.number(),
  clubCount: z.number(),
  paidMemberCount: z.number(),
  unpaidMemberCount: z.number(),
  pendingEcpRequestCount: z.number(),
  membersPerClub: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      memberCount: z.number(),
      paidMemberCount: z.number(),
    }),
  ),
});

export const pageSchema = <S extends z.ZodTypeAny>(item: S) =>
  z.object({ items: z.array(item), nextCursor: z.string().nullable() });

export const errorBodySchema = z.object({
  error: z.object({ code: z.string() }),
});

export type Member = z.infer<typeof memberSchema>;
export type MemberDetail = z.infer<typeof memberDetailSchema>;
export type Club = z.infer<typeof clubSchema>;
export type EcpRequest = z.infer<typeof ecpRequestSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type Stats = z.infer<typeof statsSchema>;
