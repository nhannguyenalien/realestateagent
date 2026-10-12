-- Explicit demo listings: approximate sample coordinates, not real offers.
-- Optional and idempotent. Never invent coordinates for existing listings.
INSERT INTO properties (slug,title,description,property_type,status,price,currency,bedrooms,bathrooms,area_sqm,address_line,city,region,country_code,latitude,longitude,primary_image_url,published_at)
SELECT slug,title,'DỮ LIỆU DEMO — Bất động sản giả lập để thử tìm kiếm theo khoảng cách. Không phải tin chào bán thật. Tọa độ chỉ phục vụ minh họa.', 'apartment','published',price,'VND',2,2,70,address,city,region,'VN',lat,lng,'/assets/figma/property-1.png',now()
FROM (VALUES
 ('demo-nearby-hcm-1','[DEMO] Căn hộ Bến Nghé',2500000000,'Khu vực Bến Nghé','Ho Chi Minh City','Quan 1',10.7769,106.7009),
 ('demo-nearby-hcm-2','[DEMO] Căn hộ Thủ Thiêm',2800000000,'Khu vực Thủ Thiêm','Ho Chi Minh City','Thu Duc',10.7730,106.7190),
 ('demo-nearby-hcm-3','[DEMO] Căn hộ Thảo Điền',4200000000,'Khu vực Thảo Điền','Ho Chi Minh City','Thu Duc',10.8030,106.7320),
 ('demo-nearby-hcm-far','[DEMO] Căn hộ xa trung tâm',2200000000,'Khu vực Thủ Đức','Ho Chi Minh City','Thu Duc',10.8700,106.8000),
 ('demo-nearby-hanoi','[DEMO] Căn hộ Hoàn Kiếm',2900000000,'Khu vực Hoàn Kiếm','Ha Noi','Hoan Kiem',21.0285,105.8542),
 ('demo-nearby-danang','[DEMO] Căn hộ Hải Châu',2100000000,'Khu vực Hải Châu','Da Nang','Hai Chau',16.0544,108.2022)
) AS demo(slug,title,price,address,city,region,lat,lng)
ON CONFLICT (slug) DO NOTHING;
