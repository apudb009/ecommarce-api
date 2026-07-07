import { Prisma } from 'src/generated/prisma/client';

export type InvoiceType = Prisma.InvoiceGetPayload<{
  include: {
    order: {
      include: {
        items: true;
        address: true;
        payment: true;
      };
    };
    user: {
      select: {
        id: true;
        name: true;
        email: true;
        username: true;
      };
    };
  };
}>;
