import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCartDto } from './dto/add-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { PrismaService } from 'src/prisma.service';
import { ProductService } from 'src/product/product.service';
import {
  CartItemWithProduct,
  CartWithItems,
  FormattedCart,
  FormattedCartItem,
} from './entities/cart.entity';

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    private product: ProductService,
  ) {}

  // ── GET OR CREATE CART ─────────────────────────────
  async getOrCreate(userId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: {
        userId,
      },
      include: this.getCartInclude(),
    });

    if (!cart) {
      return this.prisma.cart.create({
        data: {
          userId,
        },
        include: this.getCartInclude(),
      });
    }
    return this.formatCart(cart);
  }

  // ── ADD ITEM ───────────────────────────────────────
  async addItem(userId: number, dto: CreateCartDto) {
    // verify product exists and is active and stock available
    const product = await this.product.findOne(dto.productId);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.isActive) {
      throw new NotFoundException('Product is inactive');
    }

    if (product.stock < dto.quantity) {
      throw new BadRequestException(
        `Only ${product.stock} items available in stock`,
      );
    }

    let cart = await this.prisma.cart.findUnique({
      where: {
        userId,
      },
      include: this.getCartInclude(),
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: {
          userId,
        },
        include: this.getCartInclude(),
      });
    }

    // check if product already in cart
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: dto.productId,
        },
      },
    });

    if (existingItem) {
      const quantity = existingItem.quantity + dto.quantity;

      if (quantity > product.stock) {
        throw new BadRequestException(
          `Only ${product.stock} items available in stock`,
        );
      }

      //update cart-item
      await this.prisma.cartItem.update({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId: dto.productId,
          },
        },
        data: {
          quantity,
        },
      });
    } else {
      // add cart-item
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: dto.productId,
          quantity: dto.quantity,
        },
      });
    }

    //Return updated cart
    return await this.getFormattedCart(userId);
  }

  // ── UPDATE ITEM QUANTITY ────────────────────────────
  async updateItemQuantity(
    userId: number,
    dto: UpdateCartDto,
    productId: number,
  ) {
    const { quantity = 1 } = dto;
    //Product
    const product = await this.product.findOne(productId);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.stock < quantity) {
      throw new BadRequestException(
        `Only ${product.stock} items available in stock`,
      );
    }

    const cart = await this.prisma.cart.findUnique({
      where: {
        userId,
      },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const cartItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: productId,
        },
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.update({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: productId,
        },
      },
      data: {
        quantity,
      },
    });

    return await this.getFormattedCart(userId);
  }

  // ── REMOVE ITEM ────────────────────────────────────
  async removeItem(userId: number, productId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: {
        userId,
      },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const cartItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: productId,
        },
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: productId,
        },
      },
    });

    return await this.getFormattedCart(userId);
  }

  // ── CLEAR CART ─────────────────────────────────────
  async clearCart(userId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: {
        userId,
      },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    await this.prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
      },
    });

    return { message: 'Cart cleared successfully' };
  }
  // ── HELPER — reusable include ──────────────────────
  private async getFormattedCart(userId: number) {
    const updatedCart = await this.prisma.cart.findUnique({
      where: {
        userId,
      },
      include: this.getCartInclude(),
    });

    return this.formatCart(updatedCart as CartWithItems);
  }
  private getCartInclude() {
    return {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              images: true,
              isActive: true,
              stock: true,
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          id: 'asc' as const,
        },
      },
    };
  }

  // ── HELPER — calculate totals ──────────────────────
  private formatCart(cart: CartWithItems): FormattedCart {
    const items: FormattedCartItem[] = cart.items.map(
      (item: CartItemWithProduct) => {
        return {
          ...item,
          subtotal: Number(item.product.price) * item.quantity,
        };
      },
    );

    const totalQuantity = items.reduce(
      (acc: number, item: FormattedCartItem) => acc + item.quantity,
      0,
    );

    const totalAmount = items.reduce(
      (acc: number, item: FormattedCartItem) => acc + item.subtotal,
      0,
    );

    return {
      id: cart.id,
      userId: cart.userId,
      items,
      totalItems: totalQuantity,
      totalAmount,
      updatedAt: cart.updatedAt,
    };
  }
}
