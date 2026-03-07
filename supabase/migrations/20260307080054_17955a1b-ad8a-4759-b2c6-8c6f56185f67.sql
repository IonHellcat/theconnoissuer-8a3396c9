-- Remove clearly misclassified non-cigar venues from lounges
DELETE FROM lounges WHERE id = '416f1858-f77f-40e8-a6bd-7f2e4b9ab937'; -- Magic King - Cannabis - CBD - Store
DELETE FROM lounges WHERE id = '1ed1098f-99e9-4aaf-bc3a-862ebc568668'; -- Ape's Smokes & Vapes (delta-8, THCA, CBD primary)

-- Remove from pending_lounges too
DELETE FROM pending_lounges WHERE id = '9ecebb3f-273d-46e6-b288-ab1aaad76dcb'; -- Magic King - Cannabis - CBD - Store
DELETE FROM pending_lounges WHERE id = 'b4c9b106-bb15-43b7-a5a9-7e35b3df5fd1'; -- Ape's Smokes & Vapes