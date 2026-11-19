
import dns from "node:dns/promises";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

try {
  const records = await dns.resolveSrv(
    "_mongodb._tcp.cluster0.ndpwr4v.mongodb.net"
  );

  console.log("SRV Records:", records);
} catch (error) {
  console.error("DNS Error:", error);
}

