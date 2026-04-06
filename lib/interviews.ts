// Real interview questions from actual company interviews
// Sources: LeetCode Discuss, Blind, Glassdoor, interview experiences

import { collection, addDoc, query, where, getDocs, orderBy } from "firebase/firestore";
import { db, isFirebaseReady } from "./firebase";

export interface InterviewQuestion {
  id: string;
  question: string;
  answer: string;
  code?: string;
  difficulty: "easy" | "medium" | "hard";
  topic: string;
}

export interface Company {
  id: string;
  name: string;
  logo: string;
  color: string;
  description: string;
  questionCount: number;
}

export const COMPANIES: Company[] = [
  {
    id: "google",
    name: "Google",
    logo: "G",
    color: "#4285F4",
    description: "Algorithms, system design, and Googlyness interviews",
    questionCount: 6,
  },
  {
    id: "amazon",
    name: "Amazon",
    logo: "A",
    color: "#FF9900",
    description: "Leadership principles + coding + system design",
    questionCount: 6,
  },
  {
    id: "microsoft",
    name: "Microsoft",
    logo: "M",
    color: "#00A4EF",
    description: "Coding fundamentals and problem solving",
    questionCount: 5,
  },
  {
    id: "meta",
    name: "Meta",
    logo: "F",
    color: "#0668E1",
    description: "Algorithms, system design, and product sense",
    questionCount: 6,
  },
  {
    id: "netflix",
    name: "Netflix",
    logo: "N",
    color: "#E50914",
    description: "System design and culture fit focus",
    questionCount: 4,
  },
  {
    id: "apple",
    name: "Apple",
    logo: "A",
    color: "#555555",
    description: "Technical deep dives and product design",
    questionCount: 4,
  },
  {
    id: "optum",
    name: "Optum",
    logo: "O",
    color: "#FF6B35",
    description: "Healthcare tech, data engineering, and system design",
    questionCount: 5,
  },
];

export const INTERVIEW_QUESTIONS: Record<string, InterviewQuestion[]> = {
  google: [
    {
      id: "g1",
      question: "Design a hit counter that counts the number of hits received in the past 5 minutes",
      answer: "Use a circular buffer or queue with timestamps. For each hit, record the timestamp. When getting the count, remove entries older than 5 minutes. Can optimize with buckets for each second/minute. Follow-up: How to handle millions of requests per second? Use sliding window with counters.",
      code: `class HitCounter {
  private hits: number[];
  private timestamps: number[];

  constructor() {
    this.hits = new Array(300).fill(0); // 5 minutes = 300 seconds
    this.timestamps = new Array(300).fill(0);
  }

  hit(timestamp: number): void {
    const index = timestamp % 300;
    if (this.timestamps[index] !== timestamp) {
      this.timestamps[index] = timestamp;
      this.hits[index] = 1;
    } else {
      this.hits[index]++;
    }
  }

  getHits(timestamp: number): number {
    let total = 0;
    for (let i = 0; i < 300; i++) {
      if (timestamp - this.timestamps[i] < 300) {
        total += this.hits[i];
      }
    }
    return total;
  }
}`,
      difficulty: "medium",
      topic: "System Design",
    },
    {
      id: "g2",
      question: "Given a matrix of 1s and 0s, find the number of connected components of 1s",
      answer: "Use DFS or BFS to traverse connected components. Mark visited cells to avoid counting same component twice. Time: O(m*n), Space: O(m*n) for visited array.",
      code: `function numIslands(grid: string[][]): number {
  if (!grid || grid.length === 0) return 0;

  const rows = grid.length;
  const cols = grid[0].length;
  let count = 0;

  function dfs(r: number, c: number) {
    if (r < 0 || c < 0 || r >= rows || c >= cols || grid[r][c] === '0') {
      return;
    }
    grid[r][c] = '0'; // Mark as visited
    dfs(r + 1, c);
    dfs(r - 1, c);
    dfs(r, c + 1);
    dfs(r, c - 1);
  }

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (grid[i][j] === '1') {
        count++;
        dfs(i, j);
      }
    }
  }

  return count;
}`,
      difficulty: "medium",
      topic: "Graphs",
    },
    {
      id: "g3",
      question: "Implement a Trie (Prefix Tree) with insert, search, and startsWith methods",
      answer: "A Trie node contains a map of children and a flag indicating if it's the end of a word. For search, traverse the characters, return false if any character missing. For startsWith, same but don't need end flag.",
      code: `class TrieNode {
  children: Map<string, TrieNode>;
  isEnd: boolean;

  constructor() {
    this.children = new Map();
    this.isEnd = false;
  }
}

class Trie {
  private root: TrieNode;

  constructor() {
    this.root = new TrieNode();
  }

  insert(word: string): void {
    let node = this.root;
    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
    }
    node.isEnd = true;
  }

  search(word: string): boolean {
    const node = this.findNode(word);
    return node !== null && node.isEnd;
  }

  startsWith(prefix: string): boolean {
    return this.findNode(prefix) !== null;
  }

  private findNode(str: string): TrieNode | null {
    let node = this.root;
    for (const char of str) {
      if (!node.children.has(char)) return null;
      node = node.children.get(char)!;
    }
    return node;
  }
}`,
      difficulty: "medium",
      topic: "Trees",
    },
    {
      id: "g4",
      question: "Merge Intervals - Given a collection of intervals, merge all overlapping intervals",
      answer: "Sort intervals by start time. Iterate and merge if current interval overlaps with previous (current.start <= previous.end). Otherwise, add to result.",
      code: `function merge(intervals: number[][]): number[][] {
  if (intervals.length <= 1) return intervals;

  // Sort by start time
  intervals.sort((a, b) => a[0] - b[0]);

  const result: number[][] = [intervals[0]];

  for (let i = 1; i < intervals.length; i++) {
    const last = result[result.length - 1];
    const current = intervals[i];

    if (current[0] <= last[1]) {
      // Overlapping, merge them
      last[1] = Math.max(last[1], current[1]);
    } else {
      result.push(current);
    }
  }

  return result;
}`,
      difficulty: "medium",
      topic: "Arrays",
    },
    {
      id: "g5",
      question: "Design a URL shortening service like bit.ly",
      answer: "Key components: 1) Base62 encoding for short URLs, 2) Database to store URL mappings, 3) Cache for popular URLs, 4) Rate limiting. Use hash function or counter for unique ID. Handle collision if using hash.",
      code: `class URLShortener {
  private urlToId: Map<string, string>;
  private idToUrl: Map<string, string>;
  private counter: number;
  private base62: string;

  constructor() {
    this.urlToId = new Map();
    this.idToUrl = new Map();
    this.counter = 1000000000;
    this.base62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  }

  encode(longUrl: string): string {
    if (this.urlToId.has(longUrl)) {
      return this.urlToId.get(longUrl)!;
    }

    const id = this.counter++;
    const shortUrl = this.toBase62(id);
    this.urlToId.set(longUrl, shortUrl);
    this.idToUrl.set(shortUrl, longUrl);
    return shortUrl;
  }

  decode(shortUrl: string): string {
    return this.idToUrl.get(shortUrl) || '';
  }

  private toBase62(num: number): string {
    let result = '';
    while (num > 0) {
      result = this.base62[num % 62] + result;
      num = Math.floor(num / 62);
    }
    return result || '0';
  }
}`,
      difficulty: "medium",
      topic: "System Design",
    },
    {
      id: "g6",
      question: "Trapping Rain Water - Given n non-negative integers representing elevation map, compute trapped water",
      answer: "Two-pointer approach. Left and right pointers with max heights. Water at each position is min(maxLeft, maxRight) - height. Move pointer with smaller max.",
      code: `function trap(height: number[]): number {
  let left = 0, right = height.length - 1;
  let leftMax = 0, rightMax = 0;
  let water = 0;

  while (left < right) {
    if (height[left] < height[right]) {
      if (height[left] >= leftMax) {
        leftMax = height[left];
      } else {
        water += leftMax - height[left];
      }
      left++;
    } else {
      if (height[right] >= rightMax) {
        rightMax = height[right];
      } else {
        water += rightMax - height[right];
      }
      right--;
    }
  }

  return water;
}`,
      difficulty: "hard",
      topic: "Arrays",
    },
  ],
  amazon: [
    {
      id: "a1",
      question: "Two Sum - Find indices of two numbers that add up to target (phone screen)",
      answer: "Use a hash map to store values and indices. For each number, check if (target - num) exists in map. This is Amazon's most common phone screen question.",
      code: `function twoSum(nums: number[], target: number): number[] {
  const map = new Map<number, number>();

  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement)!, i];
    }
    map.set(nums[i], i);
  }

  return [];
}`,
      difficulty: "easy",
      topic: "Arrays",
    },
    {
      id: "a2",
      question: " LRU Cache - Design and implement a data structure for Least Recently Used (LRU) cache",
      answer: "Use HashMap + Doubly Linked List. HashMap provides O(1) lookup, DLL provides O(1) removal and insertion at both ends. Move accessed node to front, remove from tail when capacity exceeded.",
      code: `class LRUCache {
  private capacity: number;
  private cache: Map<number, ListNode>;
  private head: ListNode;
  private tail: ListNode;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map();
    this.head = new ListNode(0, 0);
    this.tail = new ListNode(0, 0);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key: number): number {
    if (!this.cache.has(key)) return -1;
    const node = this.cache.get(key)!;
    this.remove(node);
    this.addToHead(node);
    return node.value;
  }

  put(key: number, value: number): void {
    if (this.cache.has(key)) {
      this.remove(this.cache.get(key)!);
    }
    const node = new ListNode(key, value);
    this.addToHead(node);
    this.cache.set(key, node);

    if (this.cache.size > this.capacity) {
      const tail = this.tail.prev!;
      this.remove(tail);
      this.cache.delete(tail.key);
    }
  }

  private remove(node: ListNode): void {
    node.prev!.next = node.next;
    node.next!.prev = node.prev;
  }

  private addToHead(node: ListNode): void {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next!.prev = node;
    this.head.next = node;
  }
}

class ListNode {
  key: number;
  value: number;
  prev: ListNode | null = null;
  next: ListNode | null = null;
  constructor(key: number, value: number) {
    this.key = key;
    this.value = value;
  }
}`,
      difficulty: "medium",
      topic: "Data Structures",
    },
    {
      id: "a3",
      question: "Tell me about a time when you had to deal with a difficult coworker (LP: Have Backbone; Disagree and Commit)",
      answer: "Use STAR method. Situation: Describe context. Task: Your responsibility. Action: Steps taken, how you communicated disagreement respectfully. Result: Outcome, what you learned. Key: Show you can disagree constructively but still commit to team decision.",
      code: `// Example structure for LP answers:
// Situation: "In my previous role..."
// Task: "I was responsible for..."
// Action: "I scheduled a 1:1, listened to their perspective,
//         presented data to support my view, found compromise"
// Result: "We shipped on time, maintained good relationship"`,
      difficulty: "medium",
      topic: "Leadership Principles",
    },
    {
      id: "a4",
      question: "Subtree of Another Tree - Given roots of two binary trees root and subRoot, return true if subRoot is a subtree of root",
      answer: "Check if subRoot matches any subtree of root. Use helper to check if two trees are identical (same structure and values). Then recursively check left and right subtrees.",
      code: `function isSubtree(root: TreeNode | null, subRoot: TreeNode | null): boolean {
  if (!subRoot) return true;
  if (!root) return false;

  if (isSameTree(root, subRoot)) return true;

  return isSubtree(root.left, subRoot) || isSubtree(root.right, subRoot);
}

function isSameTree(p: TreeNode | null, q: TreeNode | null): boolean {
  if (!p && !q) return true;
  if (!p || !q) return false;

  return p.val === q.val &&
         isSameTree(p.left, q.left) &&
         isSameTree(p.right, q.right);
}`,
      difficulty: "medium",
      topic: "Trees",
    },
    {
      id: "a5",
      question: "Rotting Oranges - Find minimum time until no fresh orange remains",
      answer: "BFS starting from all rotten oranges simultaneously. Track time levels. If fresh oranges remain at end, return -1.",
      code: `function orangesRotting(grid: number[][]): number {
  const queue: [number, number][] = [];
  let fresh = 0;
  let minutes = 0;

  // Initialize with all rotten oranges
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c] === 2) queue.push([r, c]);
      if (grid[r][c] === 1) fresh++;
    }
  }

  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  while (queue.length && fresh) {
    const size = queue.length;
    for (let i = 0; i < size; i++) {
      const [r, c] = queue.shift()!;

      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nc >= 0 && nr < grid.length && nc < grid[0].length && grid[nr][nc] === 1) {
          grid[nr][nc] = 2;
          fresh--;
          queue.push([nr, nc]);
        }
      }
    }
    if (queue.length) minutes++;
  }

  return fresh === 0 ? minutes : -1;
}`,
      difficulty: "medium",
      topic: "BFS",
    },
    {
      id: "a6",
      question: "Design a parking lot system",
      answer: "Define Vehicle, ParkingSpot, and ParkingLot classes. Support different spot types (compact, large, handicapped). Track availability. Handle entrance/exit with payment calculation. Consider multi-level parking with spot assignment strategy.",
      code: `enum VehicleType { MOTORCYCLE, CAR, BUS }
enum SpotType { MOTORCYCLE, COMPACT, LARGE }

abstract class Vehicle {
  protected spotsNeeded: number;
  protected vehicleType: VehicleType;
  protected parkingSpots: ParkingSpot[] = [];

  abstract canFitInSpot(spot: SpotType): boolean;
}

class Car extends Vehicle {
  constructor() {
    super();
    this.spotsNeeded = 1;
    this.vehicleType = VehicleType.CAR;
  }

  canFitInSpot(spot: SpotType): boolean {
    return spot === SpotType.COMPACT || spot === SpotType.LARGE;
  }
}

class ParkingLot {
  private levels: Level[];

  constructor(numLevels: number, spotsPerLevel: number) {
    this.levels = [];
    for (let i = 0; i < numLevels; i++) {
      this.levels.push(new Level(i, spotsPerLevel));
    }
  }

  parkVehicle(vehicle: Vehicle): boolean {
    for (const level of this.levels) {
      if (level.parkVehicle(vehicle)) return true;
    }
    return false;
  }
}`,
      difficulty: "medium",
      topic: "System Design",
    },
  ],
  microsoft: [
    {
      id: "m1",
      question: "Reverse a linked list (iterative and recursive)",
      answer: "Iterative: Track prev, current, next. Update current.next to prev, move pointers forward. Recursive: Recurse to end, reverse links on way back.",
      code: `// Iterative
function reverseList(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null;
  let current = head;

  while (current) {
    const next = current.next;
    current.next = prev;
    prev = current;
    current = next;
  }

  return prev;
}

// Recursive
function reverseListRecursive(head: ListNode | null): ListNode | null {
  if (!head || !head.next) return head;

  const newHead = reverseListRecursive(head.next);
  head.next.next = head;
  head.next = null;

  return newHead;
}`,
      difficulty: "easy",
      topic: "Linked Lists",
    },
    {
      id: "m2",
      question: "Longest Substring Without Repeating Characters",
      answer: "Sliding window with Set. Expand right pointer, add to set. If duplicate, shrink from left until valid. Track max length.",
      code: `function lengthOfLongestSubstring(s: string): number {
  const set = new Set<string>();
  let left = 0;
  let maxLen = 0;

  for (let right = 0; right < s.length; right++) {
    while (set.has(s[right])) {
      set.delete(s[left]);
      left++;
    }
    set.add(s[right]);
    maxLen = Math.max(maxLen, right - left + 1);
  }

  return maxLen;
}`,
      difficulty: "medium",
      topic: "Strings",
    },
    {
      id: "m3",
      question: "Validate Binary Search Tree",
      answer: "In-order traversal should produce sorted order. Or use recursion with min/max bounds. Each node must be within valid range based on ancestors.",
      code: `function isValidBST(root: TreeNode | null): boolean {
  function validate(node: TreeNode | null, min: number, max: number): boolean {
    if (!node) return true;

    if (node.val <= min || node.val >= max) return false;

    return validate(node.left, min, node.val) &&
           validate(node.right, node.val, max);
  }

  return validate(root, -Infinity, Infinity);
}`,
      difficulty: "medium",
      topic: "Trees",
    },
    {
      id: "m4",
      question: "Clone Graph - Return a deep copy of a connected undirected graph",
      answer: "Use DFS with a hash map to track visited nodes (old node -> clone). For each neighbor, recursively clone if not visited.",
      code: `function cloneGraph(node: Node | null): Node | null {
  if (!node) return null;

  const visited = new Map<Node, Node>();

  function dfs(original: Node): Node {
    if (visited.has(original)) {
      return visited.get(original)!;
    }

    const clone = new Node(original.val);
    visited.set(original, clone);

    for (const neighbor of original.neighbors) {
      clone.neighbors.push(dfs(neighbor));
    }

    return clone;
  }

  return dfs(node);
}`,
      difficulty: "medium",
      topic: "Graphs",
    },
    {
      id: "m5",
      question: "Design a Rate Limiter for an API",
      answer: "Token Bucket: Tokens refill at fixed rate, requests consume tokens. Sliding Window: Track timestamps in window, remove old ones. Common in API gateways.",
      code: `class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private capacity: number;
  private refillRate: number; // tokens per second

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  allowRequest(): boolean {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens--;
      return true;
    }
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const newTokens = Math.floor(elapsed * this.refillRate);

    this.tokens = Math.min(this.capacity, this.tokens + newTokens);
    this.lastRefill = now;
  }
}`,
      difficulty: "medium",
      topic: "System Design",
    },
  ],
  meta: [
    {
      id: "meta1",
      question: "Median of Two Sorted Arrays - Find the median of two sorted arrays of different sizes",
      answer: "Binary search on the smaller array. Partition both arrays such that left half elements are smaller than right half. Handle edge cases for empty partitions.",
      code: `function findMedianSortedArrays(nums1: number[], nums2: number[]): number {
    if (nums1.length > nums2.length) {
      return findMedianSortedArrays(nums2, nums1);
    }

    const m = nums1.length, n = nums2.length;
    let left = 0, right = m;

    while (left <= right) {
      const partitionX = Math.floor((left + right) / 2);
      const partitionY = Math.floor((m + n + 1) / 2) - partitionX;

      const maxLeftX = partitionX === 0 ? -Infinity : nums1[partitionX - 1];
      const minRightX = partitionX === m ? Infinity : nums1[partitionX];
      const maxLeftY = partitionY === 0 ? -Infinity : nums2[partitionY - 1];
      const minRightY = partitionY === n ? Infinity : nums2[partitionY];

      if (maxLeftX <= minRightY && maxLeftY <= minRightX) {
        if ((m + n) % 2 === 0) {
          return (Math.max(maxLeftX, maxLeftY) + Math.min(minRightX, minRightY)) / 2;
        }
        return Math.max(maxLeftX, maxLeftY);
      } else if (maxLeftX > minRightY) {
        right = partitionX - 1;
      } else {
        left = partitionX + 1;
      }
    }

    throw new Error("Input arrays are not sorted");
  }`,
      difficulty: "hard",
      topic: "Binary Search",
    },
    {
      id: "meta2",
      question: "Regular Expression Matching - Implement support for '.' and '*'",
      answer: "Dynamic Programming. dp[i][j] = if s[0..i-1] matches p[0..j-1]. Handle * by checking zero or more of preceding element.",
      code: `function isMatch(s: string, p: string): boolean {
    const dp: boolean[][] = Array(s.length + 1)
      .fill(null)
      .map(() => Array(p.length + 1).fill(false));

    dp[0][0] = true;

    // Handle patterns like a*b*c*
    for (let j = 1; j <= p.length; j++) {
      if (p[j - 1] === '*') {
        dp[0][j] = dp[0][j - 2];
      }
    }

    for (let i = 1; i <= s.length; i++) {
      for (let j = 1; j <= p.length; j++) {
        if (p[j - 1] === '.' || p[j - 1] === s[i - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else if (p[j - 1] === '*') {
          dp[i][j] = dp[i][j - 2]; // zero occurrences
          if (p[j - 2] === '.' || p[j - 2] === s[i - 1]) {
            dp[i][j] = dp[i][j] || dp[i - 1][j]; // one or more
          }
        }
      }
    }

    return dp[s.length][p.length];
  }`,
      difficulty: "hard",
      topic: "Dynamic Programming",
    },
    {
      id: "meta3",
      question: "Design Facebook News Feed",
      answer: "Fan-out on write for normal users, fan-out on read for celebrities. Use feed ranking algorithm. Store user feed in cache. Key: handle celebrity posts differently due to massive follower count.",
      code: `class NewsFeedService {
    async getFeed(userId: string, page: number): Promise<Post[]> {
      const following = await this.getFollowing(userId);

      // Get from feed cache (pre-computed for normal users)
      const cachedFeed = await this.cache.getFeed(userId, page);

      // Get hot posts from celebrities (fan-out on read)
      const hotPosts = await this.getCelebrityPosts(following);

      // Merge and rank
      return this.rankAndDeduplicate(cachedFeed, hotPosts);
    }

    async createPost(userId: string, content: string): Promise<void> {
      const followers = await this.getFollowerCount(userId);

      if (followers < FANOUT_THRESHOLD) {
        // Fan-out on write: push to all followers' feeds
        await this.pushToFollowers(userId, content);
      } else {
        // Fan-out on read: mark as celebrity post
        await this.markAsHot(userId, content);
      }
    }

    private rankAndDeduplicate(feed: Post[], hotPosts: Post[]): Post[] {
      // Edge rank algorithm: affinity * weight * time_decay
      const ranked = [...feed, ...hotPosts].map(post => ({
        ...post,
        score: this.calculateEdgeRank(post)
      }));

      return ranked.sort((a, b) => b.score - a.score).slice(0, FEED_SIZE);
    }
  }`,
      difficulty: "hard",
      topic: "System Design",
    },
    {
      id: "meta4",
      question: "Product of Array Except Self - Return array where each element is product of all others without using division",
      answer: "Two-pass approach. First pass: left[i] contains product of all elements to the left. Second pass: multiply by product of all elements to the right.",
      code: `function productExceptSelf(nums: number[]): number[] {
    const n = nums.length;
    const result: number[] = new Array(n);

    // Left products
    result[0] = 1;
    for (let i = 1; i < n; i++) {
      result[i] = result[i - 1] * nums[i - 1];
    }

    // Right products
    let rightProduct = 1;
    for (let i = n - 1; i >= 0; i--) {
      result[i] *= rightProduct;
      rightProduct *= nums[i];
    }

    return result;
  }`,
      difficulty: "medium",
      topic: "Arrays",
    },
    {
      id: "meta5",
      question: "Binary Tree Maximum Path Sum - Path may start and end at any node",
      answer: "Post-order DFS. For each node, calculate max gain from left and right (don't take if negative). Update global max with node.val + left + right. Return node.val + max(left, right) for path continuing upward.",
      code: `function maxPathSum(root: TreeNode | null): number {
    let maxSum = -Infinity;

    function maxGain(node: TreeNode | null): number {
      if (!node) return 0;

      const leftGain = Math.max(maxGain(node.left), 0);
      const rightGain = Math.max(maxGain(node.right), 0);

      const priceNewPath = node.val + leftGain + rightGain;
      maxSum = Math.max(maxSum, priceNewPath);

      return node.val + Math.max(leftGain, rightGain);
    }

    maxGain(root);
    return maxSum;
  }`,
      difficulty: "hard",
      topic: "Trees",
    },
    {
      id: "meta6",
      question: "Task Scheduler - Least intervals to finish all tasks with n cooling time",
      answer: "Greedy approach. Max frequency determines structure. Calculate idle slots needed. Formula: idle = max(0, (maxFreq - 1) * (n + 1) + countOfMaxFreq - tasks.length). Result = tasks.length + idle.",
      code: `function leastInterval(tasks: string[], n: number): number {
    const freq: Record<string, number> = {};
    let maxFreq = 0, maxCount = 0;

    for (const task of tasks) {
      freq[task] = (freq[task] || 0) + 1;
      maxFreq = Math.max(maxFreq, freq[task]);
    }

    for (const task in freq) {
      if (freq[task] === maxFreq) maxCount++;
    }

    const partCount = maxFreq - 1;
    const partLength = n - (maxCount - 1);
    const emptySlots = partCount * partLength;
    const availableTasks = tasks.length - maxFreq * maxCount;
    const idles = Math.max(0, emptySlots - availableTasks);

    return tasks.length + idles;
  }`,
      difficulty: "medium",
      topic: "Greedy",
    },
  ],
  netflix: [
    {
      id: "n1",
      question: "Design a video streaming service (Netflix architecture)",
      answer: "Key components: Upload service -> Transcoding service (multiple bitrates) -> CDN distribution. Use adaptive bitrate streaming (DASH/HLS). Client chooses quality based on bandwidth. DRM for content protection.",
      code: `class NetflixStreamingService {
    async uploadVideo(video: File, metadata: VideoMetadata): Promise<void> {
      // Store in S3
      const videoId = await this.storage.upload(video);

      // Queue for transcoding to multiple formats
      await this.transcodingQueue.add({
        videoId,
        formats: ['4K', '1080p', '720p', '480p'],
        codecs: ['h264', 'h265', 'vp9']
      });
    }

    async getStreamManifest(videoId: string, userBandwidth: number): Promise<Manifest> {
      const availableQualities = await this.cdn.getAvailableQualities(videoId);

      // Select appropriate quality
      const selectedQuality = this.selectQuality(availableQualities, userBandwidth);

      return this.generateHLSManifest(videoId, selectedQuality);
    }

    private selectQuality(qualities: Quality[], bandwidth: number): Quality {
      // Choose highest quality under bandwidth limit
      for (let i = qualities.length - 1; i >= 0; i--) {
        if (qualities[i].bitrate <= bandwidth * 0.8) {
          return qualities[i];
        }
      }
      return qualities[0]; // lowest
    }
  }`,
      difficulty: "hard",
      topic: "System Design",
    },
    {
      id: "n2",
      question: "Design Netflix's recommendation system",
      answer: "Hybrid approach: Collaborative filtering (users like you), content-based (similar movies), and popularity. Use matrix factorization for collaborative filtering. Real-time personalization with recent watch history.",
      code: `class RecommendationEngine {
    async getRecommendations(userId: string): Promise<Movie[]> {
      const [collaborative, contentBased, trending] = await Promise.all([
        this.collaborativeFilter.getSimilarUsers(userId),
        this.contentBased.getSimilarMovies(userId),
        this.getTrending()
      ]);

      // Merge scores
      const scores = new Map<string, number>();

      for (const movie of collaborative) {
        scores.set(movie.id, (scores.get(movie.id) || 0) + movie.score * 0.5);
      }
      for (const movie of contentBased) {
        scores.set(movie.id, (scores.get(movie.id) || 0) + movie.score * 0.3);
      }
      for (const movie of trending) {
        scores.set(movie.id, (scores.get(movie.id) || 0) + movie.score * 0.2);
      }

      // Sort and return top N
      return Array.from(scores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([id]) => this.getMovie(id));
    }

    private async collaborativeFilter(userId: string): Promise<Movie[]> {
      // Matrix factorization or ALS
      const similarUsers = await this.findSimilarUsers(userId);
      const theirFavorites = await this.getFavorites(similarUsers);
      return theirFavorites.filter(m => !this.userWatched(userId, m));
    }
  }`,
      difficulty: "hard",
      topic: "System Design",
    },
    {
      id: "n3",
      question: "Find Top K Frequent Elements in an array",
      answer: "Use hash map for frequencies. Then use min-heap of size k or bucket sort by frequency. Bucket sort is O(n) time.",
      code: `function topKFrequent(nums: number[], k: number): number[] {
    const freq = new Map<number, number>();

    for (const num of nums) {
      freq.set(num, (freq.get(num) || 0) + 1);
    }

    // Bucket sort
    const buckets: number[][] = Array(nums.length + 1).fill(null).map(() => []);

    for (const [num, count] of freq) {
      buckets[count].push(num);
    }

    const result: number[] = [];
    for (let i = buckets.length - 1; i >= 0 && result.length < k; i--) {
      result.push(...buckets[i]);
    }

    return result.slice(0, k);
  }`,
      difficulty: "medium",
      topic: "Heaps",
    },
    {
      id: "n4",
      question: "Word Break II - Return all possible sentences that can be formed",
      answer: "DFS with memoization. Try all possible words starting at each position. If valid prefix in dictionary, recurse on remaining string.",
      code: `function wordBreak(s: string, wordDict: string[]): string[] {
    const wordSet = new Set(wordDict);
    const memo = new Map<string, string[]>();

    function dfs(remaining: string): string[] {
      if (memo.has(remaining)) return memo.get(remaining)!;
      if (remaining === '') return [''];

      const sentences: string[] = [];

      for (let i = 1; i <= remaining.length; i++) {
        const word = remaining.slice(0, i);
        if (wordSet.has(word)) {
          const subSentences = dfs(remaining.slice(i));
          for (const sub of subSentences) {
            sentences.push(word + (sub ? ' ' + sub : ''));
          }
        }
      }

      memo.set(remaining, sentences);
      return sentences;
    }

    return dfs(s);
  }`,
      difficulty: "hard",
      topic: "Dynamic Programming",
    },
  ],
  apple: [
    {
      id: "ap1",
      question: "Design an Autocomplete/Typeahead system",
      answer: "Use Trie for prefix matching. Store top suggestions at each node. Use caching for popular queries. Handle ranking by frequency.",
      code: `class AutocompleteSystem {
    private root: TrieNode;
    private hotSearches: Map<string, number>;

    constructor(sentences: string[]) {
      this.root = new TrieNode();
      this.hotSearches = new Map();

      for (const sentence of sentences) {
        this.addSentence(sentence);
      }
    }

    input(c: string): string[] {
      if (c === '#') {
        this.addSentence(this.currentInput);
        this.currentInput = '';
        this.currentNode = this.root;
        return [];
      }

      this.currentInput += c;
      if (!this.currentNode.children.has(c)) {
        this.currentNode.children.set(c, new TrieNode());
      }
      this.currentNode = this.currentNode.children.get(c)!;

      return this.currentNode.topSentences;
    }

    private addSentence(sentence: string): void {
      let node = this.root;
      for (const char of sentence) {
        if (!node.children.has(char)) {
          node.children.set(char, new TrieNode());
        }
        node = node.children.get(char)!;
        node.addSentence(sentence, this.hotSearches.get(sentence) || 0);
      }
    }
  }

  class TrieNode {
    children: Map<string, TrieNode> = new Map();
    sentences: { sentence: string; hot: number }[] = [];

    addSentence(sentence: string, hot: number): void {
      this.sentences.push({ sentence, hot });
      this.sentences.sort((a, b) => b.hot - a.hot);
      this.sentences = this.sentences.slice(0, 3);
    }

    get topSentences(): string[] {
      return this.sentences.map(s => s.sentence);
    }
  }`,
      difficulty: "medium",
      topic: "System Design",
    },
    {
      id: "ap2",
      question: "Flatten a Multilevel Doubly Linked List",
      answer: "DFS approach. Traverse and when encountering a child, recursively flatten the child list and insert it between current and next.",
      code: `function flatten(head: Node | null): Node | null {
    if (!head) return null;

    const dummy = new Node(0, null, head, null);
    let prev = dummy;
    const stack: Node[] = [head];

    while (stack.length > 0) {
      const curr = stack.pop()!;

      prev.next = curr;
      curr.prev = prev;

      // Push next first so child is processed first (DFS)
      if (curr.next) {
        stack.push(curr.next);
      }
      if (curr.child) {
        stack.push(curr.child);
        curr.child = null; // Remove child reference
      }

      prev = curr;
    }

    dummy.next!.prev = null;
    return dummy.next;
  }`,
      difficulty: "medium",
      topic: "Linked Lists",
    },
    {
      id: "ap3",
      question: "Design a Distributed Key-Value Store",
      answer: "Use consistent hashing for distribution, replication for availability (N copies), quorum-based reads/writes (R + W > N). Handle conflicts with vector clocks or last-write-wins.",
      code: `class DistributedKVStore {
    private ring: ConsistentHashRing;
    private replicationFactor: number;
    private readQuorum: number;
    private writeQuorum: number;

    constructor(nodes: Node[], replicationFactor: number = 3) {
      this.ring = new ConsistentHashRing(nodes.map(n => n.id));
      this.replicationFactor = replicationFactor;
      this.readQuorum = Math.floor(replicationFactor / 2) + 1;
      this.writeQuorum = Math.floor(replicationFactor / 2) + 1;
    }

    async put(key: string, value: string): Promise<void> {
      const nodes = this.ring.getNodes(key, this.replicationFactor);
      const timestamp = Date.now();

      const writes = await Promise.allSettled(
        nodes.map(node => this.nodes.get(node)!.write(key, value, timestamp))
      );

      const successful = writes.filter(w => w.status === 'fulfilled').length;
      if (successful < this.writeQuorum) {
        throw new Error('Write failed: insufficient replicas');
      }
    }

    async get(key: string): Promise<string | null> {
      const nodes = this.ring.getNodes(key, this.replicationFactor);

      const reads = await Promise.allSettled(
        nodes.map(node => this.nodes.get(node)!.read(key))
      );

      const values = reads
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<any>).value)
        .filter(v => v !== null);

      if (values.length < this.readQuorum) {
        throw new Error('Read failed: insufficient replicas');
      }

      // Return most recent version
      return values.sort((a, b) => b.timestamp - a.timestamp)[0].value;
    }
  }`,
      difficulty: "hard",
      topic: "System Design",
    },
    {
      id: "ap4",
      question: "Serialize and Deserialize a Binary Tree to string",
      answer: "Pre-order traversal with null markers for null nodes. For deserialization, use the same order to reconstruct.",
      code: `class Codec {
    serialize(root: TreeNode | null): string {
      const result: string[] = [];

      function preorder(node: TreeNode | null) {
        if (!node) {
          result.push('null');
          return;
        }
        result.push(String(node.val));
        preorder(node.left);
        preorder(node.right);
      }

      preorder(root);
      return result.join(',');
    }

    deserialize(data: string): TreeNode | null {
      const values = data.split(',');
      let index = 0;

      function build(): TreeNode | null {
        if (values[index] === 'null') {
          index++;
          return null;
        }

        const node = new TreeNode(parseInt(values[index]));
        index++;
        node.left = build();
        node.right = build();
        return node;
      }

      return build();
    }
  }`,
      difficulty: "medium",
      topic: "Trees",
    },
  ],
  optum: [
    {
      id: "opt1",
      question: "Design a system to process real-time healthcare claims data",
      answer: "Key components: Ingestion pipeline (Kafka/Kinesis), validation layer, fraud detection (ML), processing engine, storage (HIPAA-compliant). Consider batch vs streaming, data partitioning by provider/region, and audit logging for compliance.",
      code: `class ClaimsProcessor {
  private kafkaConsumer: KafkaConsumer;
  private validator: ClaimValidator;
  private fraudDetector: FraudDetectionService;

  async processClaim(claim: Claim): Promise<ProcessingResult> {
    // Step 1: Validate claim structure
    const validation = this.validator.validate(claim);
    if (!validation.isValid) {
      return { status: 'REJECTED', errors: validation.errors };
    }

    // Step 2: Check for fraud patterns
    const fraudScore = await this.fraudDetector.score(claim);
    if (fraudScore > 0.8) {
      await this.flagForReview(claim, fraudScore);
      return { status: 'UNDER_REVIEW', fraudScore };
    }

    // Step 3: Process payment
    const payment = this.calculatePayment(claim);
    await this.saveToDataWarehouse(claim, payment);

    return { status: 'APPROVED', paymentAmount: payment };
  }

  private calculatePayment(claim: Claim): number {
    // Apply contract rates, deductibles, copays
    const allowedAmount = claim.submittedAmount * claim.contractRate;
    return Math.max(0, allowedAmount - claim.deductible - claim.copay);
  }
}`,
      difficulty: "hard",
      topic: "System Design",
    },
    {
      id: "opt2",
      question: "Find Duplicate Patients - Given a list of patient records, find potential duplicates using fuzzy matching",
      answer: "Use blocking to reduce comparisons (same DOB/zip), then calculate similarity scores using Levenshtein distance or Soundex for names. Consider phonetic matching and address normalization.",
      code: `function findDuplicatePatients(patients: Patient[]): PatientMatch[] {
  const matches: PatientMatch[] = [];

  // Block by date of birth to reduce comparisons
  const blocked = groupBy(patients, 'dateOfBirth');

  for (const [dob, candidates] of Object.entries(blocked)) {
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        const score = calculateSimilarity(candidates[i], candidates[j]);
        if (score > 0.85) {
          matches.push({
            patient1: candidates[i],
            patient2: candidates[j],
            confidence: score
          });
        }
      }
    }
  }

  return matches.sort((a, b) => b.confidence - a.confidence);
}

function calculateSimilarity(p1: Patient, p2: Patient): number {
  const nameSim = jaroWinkler(p1.name, p2.name);
  const addressSim = jaroWinkler(normalizeAddress(p1.address), normalizeAddress(p2.address));
  const phoneSim = p1.phone === p2.phone ? 1.0 : 0.0;

  // Weighted average
  return nameSim * 0.5 + addressSim * 0.3 + phoneSim * 0.2;
}`,
      difficulty: "medium",
      topic: "Arrays & Strings",
    },
    {
      id: "opt3",
      question: "Explain HIPAA compliance considerations when designing a healthcare API",
      answer: "Key requirements: Encryption at rest and in transit (TLS 1.2+), authentication (OAuth2/OIDC), audit logging for all PHI access, access controls (RBAC), data minimization, breach notification procedures, business associate agreements, and regular security assessments.",
      code: `// Example HIPAA-compliant API design
interface HIPAACompliantAPI {
  // All endpoints require authentication
  @RequireAuth
  @AuditLog(action = "READ_PATIENT")
  getPatient(id: string, requester: User): Patient {
    // Verify user has access to this patient's data
    if (!canAccess(requester, id)) {
      throw new UnauthorizedError();
    }

    // Log the access for audit trail
    auditLogger.log({
      userId: requester.id,
      patientId: id,
      action: "READ",
      timestamp: new Date(),
      ipAddress: requester.ip
    });

    // Return minimal necessary data
    return maskSensitiveFields(getPatientFromDB(id));
  }
}`,
      difficulty: "medium",
      topic: "System Design",
    },
    {
      id: "opt4",
      question: "SQL Query: Find the top 5 providers with the highest claim denial rate in the last 6 months",
      answer: "Join claims with providers, filter by date and status, group by provider, calculate denial rate as denied/total, order by rate descending and limit to 5.",
      code: `SELECT
  p.provider_id,
  p.provider_name,
  COUNT(*) as total_claims,
  SUM(CASE WHEN c.status = 'DENIED' THEN 1 ELSE 0 END) as denied_claims,
  ROUND(
    SUM(CASE WHEN c.status = 'DENIED' THEN 1 ELSE 0 END) * 100.0 / COUNT(*),
    2
  ) as denial_rate_percent
FROM providers p
JOIN claims c ON p.provider_id = c.provider_id
WHERE c.submitted_date >= DATEADD(month, -6, GETDATE())
GROUP BY p.provider_id, p.provider_name
HAVING COUNT(*) >= 10  -- Filter providers with at least 10 claims
ORDER BY denial_rate_percent DESC
LIMIT 5;`,
      difficulty: "medium",
      topic: "Database Design",
    },
    {
      id: "opt5",
      question: "Design an ETL pipeline for migrating legacy patient data to a modern data warehouse",
      answer: "Components: Extract (CDC or batch from legacy), Transform (data quality checks, normalization, mapping), Load (incremental to warehouse). Handle schema evolution, data validation, error handling, idempotency, and rollback capability.",
      code: `class PatientDataETL {
  private extractor: DataExtractor;
  private transformer: DataTransformer;
  private loader: DataLoader;

  async runPipeline(): Promise<ETLResult> {
    const metrics = { extracted: 0, transformed: 0, loaded: 0, errors: 0 };

    try {
      // Extract from legacy system
      const batchIterator = this.extractor.extractInBatches(1000);

      for await (const batch of batchIterator) {
        metrics.extracted += batch.length;

        // Transform
        const transformed = batch
          .map(record => this.transformer.transform(record))
          .filter(result => result.isValid);

        metrics.transformed += transformed.length;
        metrics.errors += batch.length - transformed.length;

        // Load to warehouse
        await this.loader.loadBatch(transformed);
        metrics.loaded += transformed.length;
      }

      return { success: true, metrics };
    } catch (error) {
      await this.handlePipelineFailure(error);
      return { success: false, error: error.message };
    }
  }

  private transform(record: LegacyPatient): TransformedPatient {
    return {
      patientId: this.mapPatientId(record.legacy_id),
      name: this.standardizeName(record.name),
      dateOfBirth: this.parseDate(record.dob),
      // Data quality validation
      isValid: this.validateRequiredFields(record)
    };
  }
}`,
      difficulty: "hard",
      topic: "System Design",
    },
  ],
};

export function getRandomQuestions(companyId: string, count: number = 3): InterviewQuestion[] {
  const questions = INTERVIEW_QUESTIONS[companyId] || [];
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getCompanyById(companyId: string): Company | undefined {
  return COMPANIES.find(c => c.id === companyId);
}

export const DIFFICULTY_COLORS = {
  easy: "#22c55e",
  medium: "#eab308",
  hard: "#ef4444",
};

// Solution submission types
export interface InterviewSolution {
  id: string;
  questionId: string;
  authorName: string;
  experience: string;
  code: string;
  language?: string;
  createdAt: number;
  likes?: number;
}

const SOLUTIONS_COLLECTION = "interview_solutions";

/**
 * Submit a new solution for an interview question
 */
export async function submitSolution(
  questionId: string,
  authorName: string,
  experience: string,
  code: string,
  language: string = "typescript"
): Promise<InterviewSolution | null> {
  if (!isFirebaseReady() || !db) {
    console.warn("Firebase not initialized, cannot submit solution");
    throw new Error("Firebase not initialized");
  }

  const solutionData = {
    questionId,
    authorName: authorName.trim() || "Anonymous",
    experience: experience.trim() || "Not specified",
    code: code.trim(),
    language,
    createdAt: Date.now(),
    likes: 0,
  };

  const docRef = await addDoc(collection(db, SOLUTIONS_COLLECTION), solutionData);

  return {
    id: docRef.id,
    ...solutionData,
  };
}

/**
 * Get all solutions for a specific question (no composite index needed)
 */
export async function getSolutions(questionId: string): Promise<InterviewSolution[]> {
  if (!isFirebaseReady() || !db) {
    console.warn("Firebase not initialized, returning empty solutions");
    return [];
  }

  const q = query(
    collection(db, SOLUTIONS_COLLECTION),
    where("questionId", "==", questionId)
  );

  const snapshot = await getDocs(q);
  const solutions = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as InterviewSolution));

  // Sort client-side (avoids requiring a Firestore composite index)
  return solutions.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Get all solutions across all questions (for community page)
 */
export async function getAllSolutions(): Promise<InterviewSolution[]> {
  if (!isFirebaseReady() || !db) {
    console.warn("Firebase not initialized, returning empty solutions");
    return [];
  }

  const snapshot = await getDocs(collection(db, SOLUTIONS_COLLECTION));
  const solutions = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as InterviewSolution));

  return solutions.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Get all questions as a flat array (for community page)
 */
export function getAllQuestions(): (InterviewQuestion & { companyId: string; companyName: string })[] {
  const all: (InterviewQuestion & { companyId: string; companyName: string })[] = [];
  for (const company of COMPANIES) {
    const questions = INTERVIEW_QUESTIONS[company.id] || [];
    for (const q of questions) {
      all.push({ ...q, companyId: company.id, companyName: company.name });
    }
  }
  return all;
}
