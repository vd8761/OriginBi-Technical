import { Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "users", synchronize: false })
export class UserEntity {
    @PrimaryColumn({ name: "id", type: "bigint" })
    id!: string;
}
