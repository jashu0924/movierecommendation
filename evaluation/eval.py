import requests

# Configuration
SEARCH_URL = "https://ovbnnyrdnispdwvgknvp.supabase.co/functions/v1/sync-movies/search"
TEST_QUERIES = [
    # 2 queries to calculate 
    {"q": "Inception", "relevant": [27205]}, # exact match 
    {"q": "space adventure", "relevant": [157336, 11, 272]} #keyword matches
]


# average precision helper function 
def calculate_ap(retrieved_ids, relevant_ids):
    hits = 0
    sum_precision = 0
    for i, movie_id in enumerate(retrieved_ids):
        if movie_id in relevant_ids:
            hits += 1
            precision_at_i = hits / (i + 1)
            sum_precision += precision_at_i
    return sum_precision / len(relevant_ids) if relevant_ids else 0

# running evaluation loop 
all_ap = []
for test in TEST_QUERIES:
    res = requests.get(f"{SEARCH_URL}?q={test['q']}").json()
    retrieved_ids = [m['id'] for m in res]
    
    ap = calculate_ap(retrieved_ids, test['relevant'])
    all_ap.append(ap)
    print(f"Query: {test['q']} | AP: {ap:.4f}")

# print out final map score for each query 
print(f"\nMean Average Precision (MAP): {sum(all_ap) / len(all_ap):.4f}")