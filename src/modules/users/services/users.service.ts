import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Paginated } from '@/shared/types';
import { User } from '../models/user.model';
import { UserRepository } from '../repositories/user.repository';
import { UpdateUserDto } from '../dto/request/update-user.dto';

/**
 * Users service.
 *
 * Handles user profile management. Authentication operations are
 * handled exclusively by AuthService.
 */
@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async findAll(page: number, pageSize: number): Promise<Paginated<User>> {
    const [items, total] = await this.userRepository.findAll(page, pageSize);
    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async updateProfile(id: string, dto: UpdateUserDto): Promise<User> {
    return this.userRepository.update(id, dto);
  }

  async remove(id: string, requestingUserId: string): Promise<void> {
    if (id === requestingUserId) {
      throw new ForbiddenException('You cannot delete your own account');
    }
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');
    await this.userRepository.softDelete(id);
  }
}
