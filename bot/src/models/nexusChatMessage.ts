import { Optional } from 'sequelize';
import { Table, Column, Model, DataType, PrimaryKey, CreatedAt, UpdatedAt, AllowNull } from 'sequelize-typescript';
interface Attributes {
  id: string;
  ownerChatId: string;
  messageId: number;
  role: 'user' | 'assistant';
  text: string;
  createdAt: Date;
  updatedAt: Date;
}
@Table({ tableName: 'nexus_chat_message' })
export class NexusChatMessage extends Model<Attributes, Optional<Attributes, 'createdAt' | 'updatedAt'>> {
  @PrimaryKey @Column(DataType.UUID) id: string;
  @AllowNull(false) @Column(DataType.BIGINT) ownerChatId: string;
  @AllowNull(false) @Column(DataType.INTEGER) messageId: number;
  @AllowNull(false) @Column(DataType.STRING(16)) role: 'user' | 'assistant';
  @AllowNull(false) @Column(DataType.TEXT) text: string;
  @CreatedAt createdAt: Date;
  @UpdatedAt updatedAt: Date;
}
