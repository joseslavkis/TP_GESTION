import { formatARS } from "@/lib/currency";

interface BalanceCardProps {
  toReceive: number;
  toPay: number;
}

export const BalanceCard = ({ toReceive, toPay }: BalanceCardProps) => {
  const balance = toReceive - toPay;
  return (
    <section className="px-5">
      <div className="rounded-3xl bg-balance-card text-balance-card-foreground p-6 shadow-lg">
        <p className="text-sm/none text-balance-card-foreground/60">
          Saldo total
        </p>
        <p
          className={`mt-2 text-4xl font-bold tracking-tight ${
            balance >= 0 ? "text-primary" : "text-danger"
          }`}
        >
          {balance >= 0 ? "+" : "-"}
          {formatARS(Math.abs(balance))}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/5 p-4">
            <p className="text-xs text-balance-card-foreground/60">Te deben</p>
            <p className="mt-1 text-lg font-semibold text-primary">
              {formatARS(toReceive)}
            </p>
          </div>
          <div className="rounded-2xl bg-white/5 p-4">
            <p className="text-xs text-balance-card-foreground/60">Debés</p>
            <p className="mt-1 text-lg font-semibold text-danger">
              {formatARS(toPay)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
