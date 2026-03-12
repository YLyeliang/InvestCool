import { useQuery } from "@tanstack/react-query";
import apiClient from "../api/client";
import type { ChartDataPoint } from "../types";

export const useMarketData = (symbol: string, period = "1mo", interval = "1d") => {
  return useQuery({
    queryKey: ["market", symbol, period, interval],
    queryFn: async () => {
      const { data } = await apiClient.get<ChartDataPoint[]>(
        `/market/ticker/${symbol}`,
        {
          params: { period, interval },
        }
      );
      return data;
    },
    enabled: !!symbol,
    refetchInterval: 60 * 1000, // Refetch every 60 seconds
  });
};
