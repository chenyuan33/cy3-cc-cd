import type { FC, PropsWithChildren } from "hono/jsx";

export const Card: FC<PropsWithChildren<Record<string, any>>> = ({ children, ...props }) => <div class='card' {...props}>{children}</div>;