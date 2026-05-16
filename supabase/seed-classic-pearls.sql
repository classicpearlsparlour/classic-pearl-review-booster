insert into public.businesses (
  id,
  name,
  category,
  location,
  google_review_link,
  services
) values (
  '11111111-1111-4111-8111-111111111111',
  'Classic Pearls Unisex Salon',
  'Unisex Salon',
  'Update salon area/city in Supabase',
  'https://share.google/ANVFFbVH78QgPCRPy',
  '[
    {"_id":"men-haircut","name":"Men Haircut","keywords":["men haircut","haircut","hair salon"]},
    {"_id":"women-haircut","name":"Women Haircut","keywords":["women haircut","ladies haircut","hair styling"]},
    {"_id":"kids-haircut","name":"Kids Haircut","keywords":["kids haircut","boys haircut","girls haircut"]},
    {"_id":"hair-color","name":"Hair Color","keywords":["hair color","hair colouring","salon hair color"]},
    {"_id":"fashion-hair-color","name":"Fashion Hair Color","keywords":["fashion hair color","creative hair color","highlights"]},
    {"_id":"hair-spa","name":"Hair Spa","keywords":["hair spa","deep nourishing spa","damage repair hair spa"]},
    {"_id":"anti-dandruff-hair-spa","name":"Anti Dandruff Hair Spa","keywords":["anti dandruff spa","hair fall spa","scalp treatment"]},
    {"_id":"keratin-treatment","name":"Keratin Treatment","keywords":["keratin treatment","smooth hair treatment","hair smoothing"]},
    {"_id":"head-massage","name":"Head Massage","keywords":["head massage","relaxing massage","head and neck massage"]},
    {"_id":"beard-styling","name":"Beard Styling","keywords":["beard styling","beard color","grooming service"]},
    {"_id":"clean-up","name":"Clean Up","keywords":["face clean up","herbal clean up","fruit clean up"]},
    {"_id":"facial","name":"Facial","keywords":["facial","gold facial","hydra facial","bridal facial"]},
    {"_id":"threading","name":"Threading","keywords":["eyebrow threading","upper lip threading","face threading"]},
    {"_id":"waxing","name":"Waxing","keywords":["rica waxing","full face waxing","brazilian waxing"]},
    {"_id":"manicure","name":"Manicure","keywords":["manicure","nail care","cut file polish"]},
    {"_id":"pedicure","name":"Pedicure","keywords":["pedicure","foot care","de-tan pedicure"]},
    {"_id":"party-makeover","name":"Party Makeover","keywords":["party makeover","styling","makeup service"]},
    {"_id":"bridal-facial","name":"Bridal Facial","keywords":["bridal facial","o3 bridal facial","glow facial"]}
  ]'::jsonb
) on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  google_review_link = excluded.google_review_link,
  services = excluded.services;
