#include <iostream>
#include <string>
#include <vector>
#include <map>
#include <unordered_map>
#include <queue>
#include <mutex>
#include <chrono>
#include <algorithm>
#include <iomanip>
#include <sstream>

#include "httplib.h"
#include "json.hpp"

using json = nlohmann::json;

// Get current system time in nanoseconds since epoch
long long current_nanoseconds() {
    return std::chrono::duration_cast<std::chrono::nanoseconds>(
        std::chrono::system_clock::now().time_since_epoch()
    ).count();
}

struct Order {
    std::string id;
    std::string side;   // "BUY" or "SELL"
    std::string type;   // "LIMIT" or "MARKET"
    double price;
    int quantity;
    long long timestamp;
    std::string status; // "OPEN", "FILLED", "PARTIAL", "CANCELLED"
    int initial_quantity; // Store original quantity for response calculations
};

class OrderBook {
private:
    std::map<double, std::queue<Order>, std::greater<double>> bids; // BUY orders (highest price first)
    std::map<double, std::queue<Order>, std::less<double>> asks;    // SELL orders (lowest price first)
    std::unordered_map<std::string, Order> all_orders;
    std::mutex mutex;

    // Matching statistics
    double last_trade_price = 0.0;
    long long last_trade_time = 0;
    int total_trades = 0;

public:
    // Process a new incoming order
    json add_order(Order order) {
        std::lock_guard<std::mutex> lock(mutex);

        // 1. Check for duplicate order ID
        if (all_orders.find(order.id) != all_orders.end()) {
            return {
                {"status", "error"},
                {"message", "Duplicate order ID"}
            };
        }

        // 2. Validate basic parameters
        if (order.id.empty()) {
            return {{"status", "error"}, {"message", "empty order ID"}};
        }
        if (order.side != "BUY" && order.side != "SELL") {
            return {{"status", "error"}, {"message", "invalid side"}};
        }
        if (order.type != "LIMIT" && order.type != "MARKET") {
            return {{"status", "error"}, {"message", "invalid type"}};
        }
        if (order.quantity <= 0) {
            return {{"status", "error"}, {"message", "invalid quantity"}};
        }
        if (order.type == "LIMIT" && order.price <= 0.0) {
            return {{"status", "error"}, {"message", "invalid price for limit order"}};
        }

        // 3. Set remaining order details
        order.timestamp = current_nanoseconds();
        order.status = "OPEN";
        order.initial_quantity = order.quantity;

        // Add to global lookup
        all_orders[order.id] = order;

        int total_filled_qty = 0;
        double total_filled_val = 0.0;

        // 4. Matching Logic
        if (order.side == "BUY") {
            while (order.quantity > 0 && !asks.empty()) {
                auto it = asks.begin();
                double best_ask_price = it->first;

                // Stop matching if it's a LIMIT order and price is less than best ask
                if (order.type == "LIMIT" && order.price < best_ask_price) {
                    break;
                }

                auto& q = it->second;
                while (!q.empty() && order.quantity > 0) {
                    auto& best_ask = q.front();

                    // Skip and clean up cancelled orders
                    if (all_orders[best_ask.id].status == "CANCELLED") {
                        q.pop();
                        continue;
                    }

                    // Execute match
                    int match_qty = std::min(order.quantity, best_ask.quantity);
                    double match_price = best_ask_price;

                    // Update quantities
                    order.quantity -= match_qty;
                    best_ask.quantity -= match_qty;
                    total_filled_qty += match_qty;
                    total_filled_val += match_qty * match_price;

                    // Update resting order in registry
                    all_orders[best_ask.id].quantity = best_ask.quantity;
                    if (best_ask.quantity == 0) {
                        all_orders[best_ask.id].status = "FILLED";
                    } else {
                        all_orders[best_ask.id].status = "PARTIAL";
                    }

                    // Update statistics
                    last_trade_price = match_price;
                    last_trade_time = order.timestamp;
                    total_trades++;

                    // Print trade execution details to stdout
                    std::cout << "[TRADE] " << order.id << " x " << best_ask.id 
                              << " | " << match_qty << " shares @ " 
                              << std::fixed << std::setprecision(2) << match_price << std::endl;

                    if (best_ask.quantity == 0) {
                        q.pop();
                    }
                }

                if (q.empty()) {
                    asks.erase(it);
                }
            }

            // Post-match processing for incoming BUY order
            if (order.quantity > 0) {
                if (order.type == "LIMIT") {
                    order.status = (total_filled_qty > 0) ? "PARTIAL" : "OPEN";
                    all_orders[order.id] = order;
                    bids[order.price].push(order);
                } else {
                    // MARKET order remaining quantity is cancelled (no resting place)
                    order.status = (total_filled_qty > 0) ? "PARTIAL" : "CANCELLED";
                    order.quantity = 0;
                    all_orders[order.id] = order;
                }
            } else {
                order.status = "FILLED";
                all_orders[order.id] = order;
            }

        } else { // order.side == "SELL"
            while (order.quantity > 0 && !bids.empty()) {
                auto it = bids.begin();
                double best_bid_price = it->first;

                // Stop matching if it's a LIMIT order and price is higher than best bid
                if (order.type == "LIMIT" && order.price > best_bid_price) {
                    break;
                }

                auto& q = it->second;
                while (!q.empty() && order.quantity > 0) {
                    auto& best_bid = q.front();

                    // Skip and clean up cancelled orders
                    if (all_orders[best_bid.id].status == "CANCELLED") {
                        q.pop();
                        continue;
                    }

                    // Execute match
                    int match_qty = std::min(order.quantity, best_bid.quantity);
                    double match_price = best_bid_price;

                    // Update quantities
                    order.quantity -= match_qty;
                    best_bid.quantity -= match_qty;
                    total_filled_qty += match_qty;
                    total_filled_val += match_qty * match_price;

                    // Update resting order in registry
                    all_orders[best_bid.id].quantity = best_bid.quantity;
                    if (best_bid.quantity == 0) {
                        all_orders[best_bid.id].status = "FILLED";
                    } else {
                        all_orders[best_bid.id].status = "PARTIAL";
                    }

                    // Update statistics
                    last_trade_price = match_price;
                    last_trade_time = order.timestamp;
                    total_trades++;

                    // Print trade execution details to stdout (resting BUY first, then incoming SELL)
                    std::cout << "[TRADE] " << best_bid.id << " x " << order.id 
                              << " | " << match_qty << " shares @ " 
                              << std::fixed << std::setprecision(2) << match_price << std::endl;

                    if (best_bid.quantity == 0) {
                        q.pop();
                    }
                }

                if (q.empty()) {
                    bids.erase(it);
                }
            }

            // Post-match processing for incoming SELL order
            if (order.quantity > 0) {
                if (order.type == "LIMIT") {
                    order.status = (total_filled_qty > 0) ? "PARTIAL" : "OPEN";
                    all_orders[order.id] = order;
                    asks[order.price].push(order);
                } else {
                    // MARKET order remaining quantity is cancelled (no resting place)
                    order.status = (total_filled_qty > 0) ? "PARTIAL" : "CANCELLED";
                    order.quantity = 0;
                    all_orders[order.id] = order;
                }
            } else {
                order.status = "FILLED";
                all_orders[order.id] = order;
            }
        }

        // 5. Build response JSON
        double fill_price = (total_filled_qty > 0) ? (total_filled_val / total_filled_qty) : 0.0;
        std::string result_status = all_orders[order.id].status;

        // The prompt expects "QUEUED" for limit orders that are not fully filled immediately but rest
        if (result_status == "OPEN") {
            result_status = "QUEUED";
        }

        return {
            {"status", "ok"},
            {"order_id", order.id},
            {"result", result_status},
            {"filled_quantity", total_filled_qty},
            {"filled_price", fill_price},
            {"timestamp", order.timestamp}
        };
    }

    // Cancel an order by ID
    json cancel_order(const std::string& id) {
        std::lock_guard<std::mutex> lock(mutex);

        auto it = all_orders.find(id);
        if (it == all_orders.end()) {
            return {
                {"status", "error"},
                {"message", "order not found"}
            };
        }

        auto& order = it->second;
        if (order.status != "OPEN" && order.status != "PARTIAL") {
            return {
                {"status", "error"},
                {"message", "cannot cancel order with status: " + order.status}
            };
        }

        order.status = "CANCELLED";
        return {
            {"status", "ok"},
            {"order_id", id},
            {"result", "CANCELLED"}
        };
    }

    // Retrieve order book representation with statistics
    json get_orderbook() {
        std::lock_guard<std::mutex> lock(mutex);

        json bids_json = json::array();
        for (auto it = bids.begin(); it != bids.end(); ) {
            auto& q = it->second;
            
            // Clean up leading cancelled orders
            while (!q.empty() && all_orders[q.front().id].status == "CANCELLED") {
                q.pop();
            }

            if (q.empty()) {
                it = bids.erase(it);
            } else {
                int total_qty = 0;
                int order_count = 0;
                std::queue<Order> temp_q = q;
                while (!temp_q.empty()) {
                    const auto& ord = temp_q.front();
                    if (all_orders[ord.id].status != "CANCELLED") {
                        total_qty += all_orders[ord.id].quantity;
                        order_count++;
                    }
                    temp_q.pop();
                }

                if (total_qty > 0) {
                    bids_json.push_back({
                        {"price", it->first},
                        {"quantity", total_qty},
                        {"orders", order_count}
                    });
                    ++it;
                } else {
                    // All remaining elements in this queue are cancelled
                    while (!q.empty()) q.pop();
                    it = bids.erase(it);
                }
            }
        }

        json asks_json = json::array();
        for (auto it = asks.begin(); it != asks.end(); ) {
            auto& q = it->second;

            // Clean up leading cancelled orders
            while (!q.empty() && all_orders[q.front().id].status == "CANCELLED") {
                q.pop();
            }

            if (q.empty()) {
                it = asks.erase(it);
            } else {
                int total_qty = 0;
                int order_count = 0;
                std::queue<Order> temp_q = q;
                while (!temp_q.empty()) {
                    const auto& ord = temp_q.front();
                    if (all_orders[ord.id].status != "CANCELLED") {
                        total_qty += all_orders[ord.id].quantity;
                        order_count++;
                    }
                    temp_q.pop();
                }

                if (total_qty > 0) {
                    asks_json.push_back({
                        {"price", it->first},
                        {"quantity", total_qty},
                        {"orders", order_count}
                    });
                    ++it;
                } else {
                    // All remaining elements in this queue are cancelled
                    while (!q.empty()) q.pop();
                    it = asks.erase(it);
                }
            }
        }

        return {
            {"bids", bids_json},
            {"asks", asks_json},
            {"last_trade_price", last_trade_price},
            {"last_trade_time", last_trade_time},
            {"total_trades", total_trades}
        };
    }
};

int main() {
    auto start_time = std::chrono::steady_clock::now();
    OrderBook book;
    httplib::Server svr;

    // CORS and default response headers middleware
    svr.set_post_routing_handler([](const httplib::Request&, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
    });

    // Handle OPTIONS request for CORS preflight
    svr.Options(R"(.*)", [](const httplib::Request&, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type");
        res.status = 200;
    });

    // Endpoint 1: POST /order
    svr.Post("/order", [&](const httplib::Request& req, httplib::Response& res) {
        json response_json;
        try {
            auto body_json = json::parse(req.body);
            
            Order order;
            order.id = body_json.value("id", "");
            order.side = body_json.value("side", "");
            order.type = body_json.value("type", "");
            order.price = body_json.value("price", 0.0);
            order.quantity = body_json.value("quantity", 0);

            response_json = book.add_order(order);
            if (response_json.value("status", "") == "error") {
                res.status = 400;
            } else {
                res.status = 200;
            }
        } catch (const json::parse_error& e) {
            response_json = {{"status", "error"}, {"message", "Invalid JSON format"}};
            res.status = 400;
        } catch (const std::exception& e) {
            response_json = {{"status", "error"}, {"message", e.what()}};
            res.status = 500;
        }
        res.set_content(response_json.dump(), "application/json");
    });

    // Endpoint 2: DELETE /order/:id
    svr.Delete("/order/:id", [&](const httplib::Request& req, httplib::Response& res) {
        json response_json;
        try {
            std::string id = req.path_params.at("id");
            response_json = book.cancel_order(id);
            if (response_json.value("status", "") == "error") {
                res.status = 400;
            } else {
                res.status = 200;
            }
        } catch (const std::exception& e) {
            response_json = {{"status", "error"}, {"message", e.what()}};
            res.status = 500;
        }
        res.set_content(response_json.dump(), "application/json");
    });

    // Endpoint 3: GET /orderbook
    svr.Get("/orderbook", [&](const httplib::Request&, httplib::Response& res) {
        json response_json = book.get_orderbook();
        res.status = 200;
        res.set_content(response_json.dump(), "application/json");
    });

    // Endpoint 4: GET /health
    svr.Get("/health", [&](const httplib::Request&, httplib::Response& res) {
        auto now = std::chrono::steady_clock::now();
        auto uptime = std::chrono::duration_cast<std::chrono::milliseconds>(now - start_time).count();
        json response_json = {
            {"status", "ok"},
            {"uptime_ms", uptime}
        };
        res.status = 200;
        res.set_content(response_json.dump(), "application/json");
    });

    // Start server
    std::cout << "[ENGINE] Order matching engine running on port 8080" << std::endl;
    if (!svr.listen("0.0.0.0", 8080)) {
        std::cerr << "Failed to start server on port 8080" << std::endl;
        return 1;
    }

    return 0;
}
