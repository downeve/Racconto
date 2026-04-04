--
-- PostgreSQL database dump
--

\restrict 8rMwDv17IuiFdFUO7oepupSGhZ50GJwl2sQVy0RITqLxeUDW8yK3O6GEqoRtjCd

-- Dumped from database version 18.3 (Debian 18.3-1.pgdg13+1)
-- Dumped by pg_dump version 18.3 (Debian 18.3-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: projectstatus; Type: TYPE; Schema: public; Owner: fotpm_user
--

CREATE TYPE public.projectstatus AS ENUM (
    'IN_PROGRESS',
    'COMPLETED',
    'PUBLISHED',
    'ARCHIVED'
);


ALTER TYPE public.projectstatus OWNER TO fotpm_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: chapter_photos; Type: TABLE; Schema: public; Owner: fotpm_user
--

CREATE TABLE public.chapter_photos (
    id character varying NOT NULL,
    chapter_id character varying,
    photo_id character varying,
    order_num integer DEFAULT 0
);


ALTER TABLE public.chapter_photos OWNER TO fotpm_user;

--
-- Name: chapters; Type: TABLE; Schema: public; Owner: fotpm_user
--

CREATE TABLE public.chapters (
    id character varying NOT NULL,
    project_id character varying,
    title character varying NOT NULL,
    description text,
    order_num integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    parent_id character varying
);


ALTER TABLE public.chapters OWNER TO fotpm_user;

--
-- Name: delivery_links; Type: TABLE; Schema: public; Owner: fotpm_user
--

CREATE TABLE public.delivery_links (
    id character varying NOT NULL,
    project_id character varying NOT NULL,
    label character varying,
    password_hash character varying,
    expires_at timestamp without time zone,
    created_at timestamp without time zone,
    filter_rating integer,
    filter_color character varying
);


ALTER TABLE public.delivery_links OWNER TO fotpm_user;

--
-- Name: delivery_selections; Type: TABLE; Schema: public; Owner: fotpm_user
--

CREATE TABLE public.delivery_selections (
    id character varying NOT NULL,
    link_id character varying NOT NULL,
    photo_id character varying NOT NULL,
    comment text,
    selected_at timestamp without time zone
);


ALTER TABLE public.delivery_selections OWNER TO fotpm_user;

--
-- Name: notes; Type: TABLE; Schema: public; Owner: fotpm_user
--

CREATE TABLE public.notes (
    id character varying NOT NULL,
    project_id character varying,
    content text NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.notes OWNER TO fotpm_user;

--
-- Name: photos; Type: TABLE; Schema: public; Owner: fotpm_user
--

CREATE TABLE public.photos (
    id character varying NOT NULL,
    project_id character varying,
    image_url character varying NOT NULL,
    caption text,
    caption_en text,
    "order" integer,
    created_at timestamp without time zone,
    taken_at timestamp without time zone,
    camera character varying,
    lens character varying,
    iso character varying,
    shutter_speed character varying,
    aperture character varying,
    focal_length character varying,
    gps_lat character varying,
    gps_lng character varying,
    rating integer,
    color_label character varying,
    folder character varying,
    deleted_at timestamp without time zone
);


ALTER TABLE public.photos OWNER TO fotpm_user;

--
-- Name: pitches; Type: TABLE; Schema: public; Owner: fotpm_user
--

CREATE TABLE public.pitches (
    id character varying NOT NULL,
    project_id character varying,
    media_name character varying NOT NULL,
    editor_name character varying,
    editor_email character varying,
    sent_date timestamp without time zone,
    status character varying,
    note text,
    created_at timestamp without time zone
);


ALTER TABLE public.pitches OWNER TO fotpm_user;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: fotpm_user
--

CREATE TABLE public.projects (
    id character varying NOT NULL,
    title character varying NOT NULL,
    title_en character varying,
    description text,
    description_en text,
    status public.projectstatus,
    cover_image_url character varying,
    location character varying,
    shot_date timestamp without time zone,
    is_public character varying,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    deleted_at timestamp without time zone
);


ALTER TABLE public.projects OWNER TO fotpm_user;

--
-- Name: settings; Type: TABLE; Schema: public; Owner: fotpm_user
--

CREATE TABLE public.settings (
    key character varying NOT NULL,
    value text NOT NULL
);


ALTER TABLE public.settings OWNER TO fotpm_user;

--
-- Data for Name: chapter_photos; Type: TABLE DATA; Schema: public; Owner: fotpm_user
--

COPY public.chapter_photos (id, chapter_id, photo_id, order_num) FROM stdin;
08f045ed-5754-4197-8372-c4dea07dcc18	8f808050-3289-4587-bb82-4c43c3f88a83	1ca36154-e966-4fa1-a8b2-de9a6d06447d	0
e415ddcd-5fd5-4088-9fd8-4e8755d115c2	8f808050-3289-4587-bb82-4c43c3f88a83	105807bf-3bc0-4407-9ead-769ba0779eaa	1
e38d01ba-fa69-4584-8bb6-826e35cc1ffb	8f808050-3289-4587-bb82-4c43c3f88a83	07afe2a1-5282-49c6-b617-93c69fa3f8f9	2
ee080c75-0e1d-499d-aeaa-3161189e084c	0187403c-1c7c-4051-a7eb-66959264fc58	605b4ef3-8665-41c2-9f50-3ec0c91cb1d9	0
5ad3f7ab-1af8-4da8-9a32-07cb81bf028e	0187403c-1c7c-4051-a7eb-66959264fc58	07afe2a1-5282-49c6-b617-93c69fa3f8f9	1
e19f9701-ef8f-4744-a151-cf2496ddd7d7	0187403c-1c7c-4051-a7eb-66959264fc58	f041f136-83d8-439f-aef1-2a3f6a0aab1e	3
cc92aee1-f0c3-4e12-806b-4f9ae8c9eb2c	9327da66-7c68-4a4e-b322-add6bed29808	22dec7b3-d3e9-4255-b426-faa64ab7f713	0
9dc8c264-c904-4be4-9c5a-fe05f0d244e4	9327da66-7c68-4a4e-b322-add6bed29808	fffd23bb-7175-4a9a-bc32-4fe22c3684b5	1
\.


--
-- Data for Name: chapters; Type: TABLE DATA; Schema: public; Owner: fotpm_user
--

COPY public.chapters (id, project_id, title, description, order_num, created_at, updated_at, parent_id) FROM stdin;
0187403c-1c7c-4051-a7eb-66959264fc58	74b252ee-b975-4a09-9493-da24d7fe285c	1		0	2026-04-04 15:16:12.925421	2026-04-04 15:16:12.92543	\N
8f808050-3289-4587-bb82-4c43c3f88a83	74b252ee-b975-4a09-9493-da24d7fe285c	11		1	2026-04-04 15:16:17.803983	2026-04-04 15:16:17.803988	0187403c-1c7c-4051-a7eb-66959264fc58
cb393d0d-8e56-4c76-a1f8-cce595aaf117	74b252ee-b975-4a09-9493-da24d7fe285c	22		2	2026-04-04 15:16:22.847424	2026-04-04 15:16:22.847429	0187403c-1c7c-4051-a7eb-66959264fc58
9327da66-7c68-4a4e-b322-add6bed29808	74b252ee-b975-4a09-9493-da24d7fe285c	22		3	2026-04-04 15:16:26.26123	2026-04-04 15:16:26.261235	\N
\.


--
-- Data for Name: delivery_links; Type: TABLE DATA; Schema: public; Owner: fotpm_user
--

COPY public.delivery_links (id, project_id, label, password_hash, expires_at, created_at, filter_rating, filter_color) FROM stdin;
\.


--
-- Data for Name: delivery_selections; Type: TABLE DATA; Schema: public; Owner: fotpm_user
--

COPY public.delivery_selections (id, link_id, photo_id, comment, selected_at) FROM stdin;
\.


--
-- Data for Name: notes; Type: TABLE DATA; Schema: public; Owner: fotpm_user
--

COPY public.notes (id, project_id, content, created_at, updated_at) FROM stdin;
2dcc6267-aba1-474b-af3e-af268cb191a6	\N	123	2026-03-29 12:08:03.32872	2026-04-04 13:55:50.278806
db9855d9-666c-4b44-8aef-d98060500165	\N	test	2026-03-29 12:08:06.22822	2026-04-04 13:55:50.27881
526a8f49-42d6-4dac-ab5b-c123ed29419f	\N	노트 테스트. ᆼᆼᆼ	2026-03-27 20:20:57.884126	2026-04-04 13:55:59.461346
\.


--
-- Data for Name: photos; Type: TABLE DATA; Schema: public; Owner: fotpm_user
--

COPY public.photos (id, project_id, image_url, caption, caption_en, "order", created_at, taken_at, camera, lens, iso, shutter_speed, aperture, focal_length, gps_lat, gps_lng, rating, color_label, folder, deleted_at) FROM stdin;
a220cf23-e70b-44e3-b0df-ff533b570ee6	\N	http://localhost:8000/uploads/a220cf23-e70b-44e3-b0df-ff533b570ee6.png	test		0	2026-03-27 20:12:17.939207	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
d9488176-8294-48d2-b720-09f115dd32d6	\N	http://localhost:8000/uploads/d9488176-8294-48d2-b720-09f115dd32d6.png	aaaaa	aaaaa	4	2026-03-27 20:19:14.751099	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
815f5eda-8acd-4716-aef1-1ef495fd7ad5	\N	http://localhost:8000/uploads/815f5eda-8acd-4716-aef1-1ef495fd7ad5.jpg	\N	\N	4	2026-03-29 17:21:06.919061	2025-02-25 16:21:41	FUJIFILM GFX 50R	GF50mmF3.5 R LM WR	ISO 1600	1/300s	f/11.0	50mm	\N	\N	\N	\N	\N	\N
cfa228a9-c7be-4f4d-b315-15ccb31dd53d	\N	http://localhost:8000/uploads/cfa228a9-c7be-4f4d-b315-15ccb31dd53d.jpg	\N	\N	5	2026-03-29 17:21:06.948393	2025-02-25 16:19:28	FUJIFILM GFX 50R	GF50mmF3.5 R LM WR	ISO 1600	1/420s	f/11.0	50mm	\N	\N	\N	\N	\N	\N
e65af919-9963-46f3-989d-00eec51bd432	\N	http://localhost:8000/uploads/e65af919-9963-46f3-989d-00eec51bd432.jpg	\N	\N	3	2026-03-29 17:17:33.029547	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
1ca36154-e966-4fa1-a8b2-de9a6d06447d	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/0382a182-e041-4695-ea54-a8d797fd1e00/public	\N	\N	0	2026-04-04 15:00:10.102178	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
22dec7b3-d3e9-4255-b426-faa64ab7f713	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/ac8b36be-6f2c-4f05-2c6b-9bb333777e00/public	\N	\N	1	2026-04-04 15:00:12.316675	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
07afe2a1-5282-49c6-b617-93c69fa3f8f9	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/16e5d66a-52a1-459a-26ba-b67ed09c1700/public	\N	\N	5	2026-04-04 15:00:20.845522	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	2026-04-04 18:31:15.884809
998fd3d8-9c99-48a9-807a-56149e22e590	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/3009b265-80fd-43eb-f02e-2ec9a475e100/public	\N	\N	3	2026-04-04 15:00:16.714498	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
4dbcc67d-2e91-4f8a-b855-92c786fea34e	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/50c4f9b5-7280-4b8d-48c2-565a08dd9c00/public	\N	\N	4	2026-04-04 15:00:18.697849	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
a5708ecd-e150-4895-b875-9270a0120f1f	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/62041c06-a9d5-43c2-8a0b-37a42c494200/public	\N	\N	6	2026-04-04 15:00:23.207861	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
105807bf-3bc0-4407-9ead-769ba0779eaa	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/5257463f-4738-4970-92d8-bc3d5128b600/public	\N	\N	2	2026-04-04 15:00:14.563894	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
b800ad2f-b324-4a8e-aeb5-f9074bcbc22c	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/5494b3f3-ac0f-436e-218c-baf9ca4a8d00/public	\N	\N	10	2026-04-04 15:00:31.905762	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
f041f136-83d8-439f-aef1-2a3f6a0aab1e	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/6820fa26-83c5-44d2-0ca2-59b5db157900/public	\N	\N	11	2026-04-04 15:00:34.255003	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
16169f01-ffca-42f5-aac6-099249c1419b	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/094170ab-2a76-46eb-7efb-5c7c708b8a00/public	\N	\N	12	2026-04-04 15:00:36.441036	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
605b4ef3-8665-41c2-9f50-3ec0c91cb1d9	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/56ae43ae-5112-4513-31eb-1d1992019700/public	\N	\N	13	2026-04-04 15:00:38.604823	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
29460d51-a21c-4803-9d57-c71654290bf9	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/ac2128e9-ec1a-4167-acac-45c147639100/public	\N	\N	14	2026-04-04 15:00:41.843247	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
fffd23bb-7175-4a9a-bc32-4fe22c3684b5	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/2dffc99c-2413-4052-8aac-814dec4e0600/public	\N	\N	15	2026-04-04 15:00:44.581996	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
c323b5e2-65a6-4b7a-a729-8dfb38157fa9	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/5b5bfd65-ee94-4988-f84a-5d3e11ae7e00/public	\N	\N	16	2026-04-04 15:00:46.899698	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
22cbf7bf-004e-47e0-afbd-26d08bd3ea7b	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/0173bc30-2a05-4852-7b28-fc0606dcd800/public	\N	\N	18	2026-04-04 15:31:14.723778	2024-12-07 12:03:01	FUJIFILM GFX 50R	GF35-70mmF4.5-5.6 WR	ISO 400	1/1250s	f/11.0	70mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
a6406145-3080-4611-a735-614118979a44	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/8eee0753-3ad8-4609-265f-e9c46819c400/public	\N	\N	19	2026-04-04 15:31:16.884085	\N	Nikon LS-50	-- mm f/--	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
6d9a3bfd-bdd3-4775-9b1d-0aadb94f423b	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/caa6f514-1e19-46fe-92bd-a7a7a8924d00/public	\N	\N	20	2026-04-04 15:31:19.300393	2019-12-28 13:27:44	FUJIFILM GFX 50R	Fujifilm Fujinon GF45mm F2.8 R WR	ISO 400	1/420s	f/5.6	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
b061542b-5839-4ed3-ae8c-4b65bcc8a7b4	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/be0f040b-6d50-4eb7-f455-74f82ac23d00/public	\N	\N	21	2026-04-04 15:31:21.176124	2019-01-01 15:29:29	FUJIFILM GFX 50R	Fujinon GF45mm F2.8 R WR	ISO 800	1/1600s	f/7.1	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
6478aa62-002a-4a1a-af4f-af2c4de7e0e1	\N	http://localhost:8000/uploads/6478aa62-002a-4a1a-af4f-af2c4de7e0e1.jpg	\N	\N	2	2026-03-29 17:17:33.016111	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
1b66f14c-fdfc-4d1f-99ff-bd89107efa89	\N	http://localhost:8000/uploads/1b66f14c-fdfc-4d1f-99ff-bd89107efa89.png	\N	\N	3	2026-03-27 20:19:14.776826	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
6f4ee7e7-b198-4a29-812e-f1f16cbdc70d	\N	http://localhost:8000/uploads/6f4ee7e7-b198-4a29-812e-f1f16cbdc70d.png	bbbbb	ccccc	2	2026-03-27 20:19:14.738862	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
6f53c541-c762-45bc-b776-d41a2f71f792	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/0350fcab-2ae5-47e2-968b-10226aeda600/public	\N	\N	22	2026-04-04 15:31:23.329706	2024-02-29 11:27:32	FUJIFILM GFX 50R	GF35-70mmF4.5-5.6 WR	ISO 6400	1/45s	f/4.5	35mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
6d734997-fab3-4d19-871b-2ad05003bb31	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/908c046f-47da-45eb-13fa-6da5e184de00/public	\N	\N	23	2026-04-04 15:31:25.482559	2018-12-30 09:42:06	FUJIFILM GFX 50R	Fujinon GF45mm F2.8 R WR	ISO 800	1/70s	f/8.0	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
a6747e62-41eb-4527-9327-ff711f95bfd7	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/8775074b-76b8-433c-5388-f366bf5ccc00/public	\N	\N	29	2026-04-04 15:31:38.682865	2019-01-04 11:22:05	FUJIFILM GFX 50R	Fujinon GF45mm F2.8 R WR	ISO 800	1/850s	f/8.0	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
fbdf18bc-6002-49ce-8895-ec56b81ecc7a	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/2f9276b1-82a0-4820-0788-898080f35300/public	\N	\N	34	2026-04-04 15:31:49.954379	2006-08-20 18:24:15	PENTAX Corporation PENTAX *ist DL2	230 mm f/--	ISO 200	1/400s	f/9.0	230mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
e9670ceb-1a3a-4d97-abec-4c5e2eb3ecbb	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/54185fae-55bd-44f5-7198-407518bfcf00/public	\N	\N	39	2026-04-04 15:32:00.906364	\N	Nikon LS-50	-- mm f/--	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
16538fec-e785-4cc4-85ed-092585c57529	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/e9861beb-5021-4001-403c-456c0076a100/public	\N	\N	44	2026-04-04 15:32:11.555889	2025-02-25 16:19:28	FUJIFILM GFX 50R	GF50mmF3.5 R LM WR	ISO 1600	1/420s	f/11.0	50mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
cace0708-134d-465b-afa5-6f7dffe650e8	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/e264373b-f03d-4b7b-be87-cef429c28f00/public	\N	\N	49	2026-04-04 15:32:22.307613	\N	Nikon LS-50	-- mm f/--	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
dc7c9498-5783-44b8-a4c0-22899fb19861	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/21f584cc-2ed8-4529-6ce9-73968aca3c00/public	\N	\N	24	2026-04-04 15:31:27.577748	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
e531e452-e176-4c5b-8b91-02ad92986d06	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/a2b4a64d-06f9-4218-ae5b-ae6e4572bc00/public	\N	\N	25	2026-04-04 15:31:29.664749	2024-02-28 16:26:04	FUJIFILM GFX 50R	GF35-70mmF4.5-5.6 WR	ISO 400	1/950s	f/8.0	35mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
c369be45-4605-4d1e-8d89-7738034f9ee2	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/edaad229-4182-49c9-4ba4-8c81e15d0f00/public	\N	\N	30	2026-04-04 15:31:40.917333	\N	Nikon LS-50	-- mm f/--	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
d523c517-8181-4ade-9dd4-9c6f57196096	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/31f4c784-4329-42eb-6261-eabfb46be900/public	\N	\N	35	2026-04-04 15:31:52.202773	2003-11-23 01:31:46	SONY CYBERSHOT	-- mm f/--	ISO 400	1/50s	f/2.0	10mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
d4834466-1f3e-438f-b119-2f826987768e	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/f074d61f-a42c-481b-2f01-c9486f636300/public	\N	\N	40	2026-04-04 15:32:02.968647	2024-02-28 16:14:01	FUJIFILM GFX 50R	GF35-70mmF4.5-5.6 WR	ISO 1000	1/1100s	f/7.1	35mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
1a358e1b-2a51-47d0-8c2e-96bddb50d821	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/e60f8fc9-eb8a-46a2-efda-101fbb302f00/public	\N	\N	45	2026-04-04 15:32:13.600887	2019-07-13 14:43:58	FUJIFILM GFX 50R	Fujinon GF45mm F2.8 R WR	ISO 400	1/17s	f/2.8	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
f10e1b30-97e5-4a91-8ddc-bcddf87086e0	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/12412832-6653-4b61-85a1-21e6d9417200/public	\N	\N	50	2026-04-04 15:32:24.559179	2019-12-28 13:27:02	FUJIFILM GFX 50R	Fujifilm Fujinon GF45mm F2.8 R WR	ISO 400	1/550s	f/5.6	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
48a58c41-6ed0-4722-9c36-294fb563d982	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/a4e4aca8-3b24-47a8-3183-efb411958f00/public	\N	\N	26	2026-04-04 15:31:31.924859	2019-07-22 09:56:04	FUJIFILM GFX 50R	Fujinon GF45mm F2.8 R WR	ISO 6400	1/30s	f/4.0	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
dc48b724-4825-486a-b72c-680f39af0aa1	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/7eab9de1-d34e-4f36-8d54-51809c37fa00/public	\N	\N	31	2026-04-04 15:31:43.575046	2019-12-02 12:23:36	FUJIFILM GFX 50R	Fujifilm Fujinon GF45mm F2.8 R WR	ISO 400	1/340s	f/11.0	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
ddb1927c-a387-4607-80f9-d5da4e40330c	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/9112c1c7-f29d-4ff4-3447-a23f74a20b00/public	\N	\N	36	2026-04-04 15:31:54.452588	\N	Nikon LS-50	-- mm f/--	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
140d6919-8724-4cac-a7b5-a39616e46d57	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/4c76ff3c-df5c-4a6b-4ecd-6fb40ebb7300/public	\N	\N	41	2026-04-04 15:32:05.415145	2024-02-28 16:25:56	FUJIFILM GFX 50R	GF35-70mmF4.5-5.6 WR	ISO 400	1/450s	f/8.0	56mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
b6cac18f-9a4d-45dc-be2f-0259922c0782	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/5835896f-42dd-4c10-495c-1cb71015a900/public	\N	\N	46	2026-04-04 15:32:15.753005	2024-02-29 11:47:54	FUJIFILM GFX 50R	GF35-70mmF4.5-5.6 WR	ISO 6400	1/350s	f/5.0	42mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
beb1cdb7-99e8-43da-9e6f-969e66ce015f	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/1088dc3a-d6bc-4dbe-a83b-785ab16f5600/public	\N	\N	51	2026-04-04 15:32:26.706332	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
9798c207-c91d-410b-8661-430fdd2538b4	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/03a3e292-7d72-447d-61f7-c05d1f5f7900/public	\N	\N	27	2026-04-04 15:31:34.282231	2024-02-28 16:25:41	FUJIFILM GFX 50R	GF35-70mmF4.5-5.6 WR	ISO 400	1/1000s	f/8.0	54mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
bc53e01f-b853-4ab8-889b-f0d4ca7bde98	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/8862c576-a437-4c9b-d34f-da71dfc78000/public	\N	\N	32	2026-04-04 15:31:45.650786	\N	Nikon LS-50	-- mm f/--	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
084d9fc7-73ad-4ee1-b768-46dbecd80f2e	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/8ee1ef33-2544-4427-0f96-a94eb8af2e00/public	\N	\N	37	2026-04-04 15:31:56.526289	\N	Nikon LS-50	-- mm f/--	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
741f7a31-857f-4fb5-9321-60eb316279c4	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/22901bc0-27c8-4836-403c-d4be0497aa00/public	\N	\N	42	2026-04-04 15:32:07.670485	2019-12-02 12:30:30	FUJIFILM GFX 50R	Fujifilm Fujinon GF45mm F2.8 R WR	ISO 400	1/240s	f/16.0	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
8f191fc9-f66d-42d4-83aa-d38a134cb335	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/d7728c65-5771-4a54-ad55-fd661c50df00/public	\N	\N	47	2026-04-04 15:32:17.696457	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
40a72243-d782-4c26-ade4-9a8ef2b5d8cd	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/a988abbc-d24f-41a6-6880-e5d3ccdff600/public	\N	\N	28	2026-04-04 15:31:36.501233	2024-02-29 11:28:05	FUJIFILM GFX 50R	GF35-70mmF4.5-5.6 WR	ISO 6400	1/125s	f/4.5	35mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
b473fa01-6225-4608-90b7-e8f6fe9f3bca	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/f882ca33-2386-42e9-3f05-b7cdf2e05700/public	\N	\N	33	2026-04-04 15:31:48.205057	\N	Nikon LS-50	-- mm f/--	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
8aefdf99-4d6d-4617-9e19-8467f6a6cb43	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/c0872b74-9319-457d-099d-8c00bdd9b700/public	\N	\N	38	2026-04-04 15:31:58.766091	2003-11-23 01:31:46	SONY CYBERSHOT	\N	ISO 400	0.0s	f/2.0	10mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
31f695d5-8295-400f-a719-f42fdab30ed7	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/ab43dd27-3ea4-4798-4ab5-f389b61c0200/public	\N	\N	43	2026-04-04 15:32:09.515078	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
07f5f1dc-7a84-4035-8aff-76abf5915030	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/1f8160ab-61a5-4045-85f4-44b6bdcc8e00/public	\N	\N	48	2026-04-04 15:32:19.95349	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
5a01b246-06bf-4556-be77-59610fb53ecb	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/d7d07a0d-f1d9-4fc4-8d44-8d6af0ad9900/public	\N	\N	52	2026-04-04 15:32:29.679106	2019-08-21 02:16:50	FUJIFILM GFX 50R	Fujinon GF45mm F2.8 R WR	ISO 6400	1/12s	f/4.0	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
d0283f6a-e064-48c5-b22c-ec2dba503a22	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/b75748b9-74b3-43bc-e425-13d728360300/public	\N	\N	53	2026-04-04 15:32:31.730792	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
bcda227d-efea-49f5-87ca-a07118e1a482	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/80192592-1213-43d6-6846-581f52ff4c00/public	\N	\N	54	2026-04-04 15:32:33.776178	2019-07-13 14:51:54	FUJIFILM GFX 50R	Fujinon GF45mm F2.8 R WR	ISO 400	1/1900s	f/5.6	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
1dde956a-e15d-4a4d-84e8-a944713bcdcb	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/39cb5018-7912-438e-c922-d7be9147dc00/public	\N	\N	55	2026-04-04 15:32:36.439306	2025-02-25 16:21:08	FUJIFILM GFX 50R	GF50mmF3.5 R LM WR	ISO 1600	1/140s	f/11.0	50mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
ba726cb5-8b11-431e-9d65-0d2ab4d9400b	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/b15e92bd-5f40-4944-aef4-ae76243c1400/public	\N	\N	56	2026-04-04 15:32:39.102527	\N	Nikon LS-50	-- mm f/--	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
b662a870-4ff3-44cf-97f0-b0e1528caf3c	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/9fa76bc8-4736-47ed-38bf-7696b2b68000/public	\N	\N	57	2026-04-04 15:32:41.66293	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
a92b5375-ca5a-4f79-a54f-340d6b8a1102	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/be54e764-ed4e-4870-a801-e0ebd12a9b00/public	\N	\N	58	2026-04-04 15:32:43.710171	2019-07-22 09:42:25	FUJIFILM GFX 50R	Fujinon GF45mm F2.8 R WR	ISO 6400	1/14s	f/4.0	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
adbec906-a46a-4b03-a23d-b55228233b64	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/d1827256-d6b5-4097-736a-5cfbcef21f00/public	\N	\N	59	2026-04-04 15:32:45.860951	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
78915cc9-356a-4b60-9031-e8048ec5b3c1	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/8329b2bf-7eb2-4121-8b78-474ccc6ce700/public	\N	\N	60	2026-04-04 15:32:48.518233	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
18d4278f-a731-4e90-a885-f7d0df58538e	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/a1ae5e88-2784-408a-7440-2a2ccbd8b200/public	\N	\N	61	2026-04-04 15:32:50.259012	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
bd51cfd3-9907-4964-b152-20c30dbe2f2c	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/184de846-dc69-4428-f873-8be602f0ce00/public	\N	\N	62	2026-04-04 15:32:52.207812	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
cd43e7a4-187e-40d9-8e7c-a4911dd9bbc0	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/8136befc-86b7-41a2-5653-80a822637b00/public	\N	\N	63	2026-04-04 15:32:54.365021	\N	Nikon LS-50	-- mm f/--	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
2492784f-1b34-4c27-ae62-1cdee3767751	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/b2cf4947-a965-4003-926d-cf8b29607400/public	\N	\N	64	2026-04-04 15:32:55.79089	2019-07-13 14:52:15	FUJIFILM GFX 50R	Fujinon GF45mm F2.8 R WR	ISO 400	1/2900s	f/5.6	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
2f1f4046-535f-432b-ac64-4a193ccb04e6	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/112bce72-85da-4b90-7a23-3838b5143800/public	\N	\N	65	2026-04-04 15:32:57.839881	2019-07-13 15:11:15	FUJIFILM GFX 50R	Fujinon GF45mm F2.8 R WR	ISO 400	1/100s	f/11.0	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
9b4cfc45-1687-4235-89f3-30e37e9e692e	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/0b587c16-5557-48fb-7a6e-e8c8afce0600/public	\N	\N	66	2026-04-04 15:33:00.091483	2024-12-07 11:59:19	FUJIFILM GFX 50R	GF35-70mmF4.5-5.6 WR	ISO 400	1/640s	f/11.0	70mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
aaf3b6d2-aacf-4515-b99c-13494a77965f	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/7b8c55f6-ea0e-42cd-178b-db2e95afa300/public	\N	\N	67	2026-04-04 15:33:02.855841	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
660ca13a-272f-4d6a-8574-0aa761061c70	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/16aa5d8a-1f1d-4c6b-d15c-ba3d3b022300/public	\N	\N	68	2026-04-04 15:33:04.919093	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
b442b496-e9fe-4a56-88b6-7c1a87bae83f	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/14fe09a6-c8a1-4caf-fa8a-664ab0644b00/public	\N	\N	69	2026-04-04 15:33:07.154744	2019-12-28 13:22:22	FUJIFILM GFX 50R	Fujifilm Fujinon GF45mm F2.8 R WR	ISO 400	1/210s	f/8.0	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
a58216fc-f608-4849-b3bc-ea6510224cb8	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/0624d55e-ee9d-4340-80b3-6ab803cac000/public	\N	\N	70	2026-04-04 15:33:09.217961	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
33173e6f-9e32-4ccd-a8cb-e77be6338ee4	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/9b72b5fb-2931-4c34-09f3-68e694a68100/public	\N	\N	71	2026-04-04 15:33:11.668709	\N	Nikon LS-50	-- mm f/--	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
87b5d33e-5d99-41db-b466-7d893d2a2c6c	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/4b2b709b-6a73-4329-afdc-c39014d9c700/public	\N	\N	72	2026-04-04 15:33:13.452248	2025-02-25 16:21:41	FUJIFILM GFX 50R	GF50mmF3.5 R LM WR	ISO 1600	1/300s	f/11.0	50mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
d1571819-edde-4bf2-857b-0f16cc878181	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/7713f4fa-f262-44da-d8de-c3df8058ef00/public	\N	\N	73	2026-04-04 15:33:15.647969	2018-12-30 09:44:10	FUJIFILM GFX 50R	Fujinon GF45mm F2.8 R WR	ISO 800	1/110s	f/8.0	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
ea4cad53-6e6d-4ea2-8d14-c320de7eb484	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/738c263a-3a55-4e4a-a8ec-d7004537d600/public	\N	\N	74	2026-04-04 15:33:17.402384	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
d6af674a-37a9-45a8-b7ca-da621ac0d66f	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/1066cdff-d2c2-41f9-9664-6da71715e700/public	\N	\N	75	2026-04-04 15:33:19.450715	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
6e5971b4-ea44-4187-bdec-a2300c0f2dfc	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/0ab5e66b-ddb4-4507-64bd-de6a76137700/public	\N	\N	76	2026-04-04 15:33:22.105805	\N	Nikon LS-50	-- mm f/--	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
1e4514cc-c430-44e4-9283-2d863733c704	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/1f082882-e748-4786-9742-1eca23a6c100/public	\N	\N	81	2026-04-04 15:33:33.252058	\N	Joint Photographic Experts Group Jpeg File	-- mm f/--	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
729b361c-f99a-47b1-9621-bb5bd27554d1	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/3c314c06-6010-4f19-2434-06a45f84dd00/public	\N	\N	86	2026-04-04 15:33:44.434	2019-05-04 08:51:17	FUJIFILM GFX 50R	Fujinon GF45mm F2.8 R WR	ISO 1600	1/125s	f/5.6	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
7adafeb8-1746-4c62-b11a-1af6b09aa48a	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/29e7d956-6b9a-4f16-b013-981684b1b400/public	\N	\N	91	2026-04-04 15:33:56.104449	2019-05-04 08:51:17	FUJIFILM GFX 50R	Fujinon GF45mm F2.8 R WR	ISO 1600	1/125s	f/5.6	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
c32aaf93-1185-4463-a7d6-aa45012b3834	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/8f47dcec-1faa-4540-29e3-64a3ccd63700/public	\N	\N	96	2026-04-04 15:34:06.554645	2019-06-29 09:46:04	FUJIFILM GFX 50R	Fujinon GF45mm F2.8 R WR	ISO 400	1/90s	f/3.6	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
ac0ffad2-4310-4bbd-ad69-42a2f6988440	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/3cda823f-a95c-4d1b-625e-1950808d0a00/public	\N	\N	101	2026-04-04 15:34:17.508608	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
67712dd8-63d5-4849-88bb-ab3e2cef18fd	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/f0d2e0a6-b11a-4b0a-cde0-98f5fa4dca00/public	\N	\N	106	2026-04-04 15:34:28.463821	2019-07-07 10:13:32	FUJIFILM GFX 50R	Fujinon GF45mm F2.8 R WR	ISO 400	1/240s	f/5.6	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
0f857262-704b-48f4-969c-cd0943d8027c	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/2680eefe-3006-4c40-c487-93b5e4e88a00/public	\N	\N	111	2026-04-04 15:34:38.499526	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
b3321ee4-25c6-4e25-9b65-224b58c58645	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/904fbcf6-4b72-4c4c-09d3-72d4cb79a700/public	\N	\N	116	2026-04-04 15:34:49.353476	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
db227db9-a26f-406e-9738-d493a7c5fe83	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/2deb51af-6f1b-479f-81e7-8625aeb23b00/public	\N	\N	121	2026-04-04 15:35:00.212073	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
f63b8895-7aad-4687-b6dc-a9cc95ef33b4	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/3df24b42-0c1d-45ef-97dc-ffb0abf4c200/public	\N	\N	126	2026-04-04 15:35:13.52894	2024-12-07 12:31:42	FUJIFILM GFX 50R	GF35-70mmF4.5-5.6 WR	ISO 400	1/500s	f/11.0	35mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
f86c8e68-7dd6-4551-b080-9b50c20a804c	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/e8c2ee02-df6a-4843-c5ec-a11b860e5000/public	\N	\N	131	2026-04-04 15:35:23.863773	2024-12-07 12:14:10	FUJIFILM GFX 50R	GF35-70mmF4.5-5.6 WR	ISO 400	1/750s	f/11.0	70mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
683d372a-be99-4722-937b-908906b4c831	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/4f6f288c-0661-487c-a135-cc2168335d00/public	\N	\N	77	2026-04-04 15:33:23.955599	2024-08-14 18:23:25	FUJIFILM GFX 50R	GF50mmF3.5 R LM WR	ISO 800	1/420s	f/11.0	50mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
aac4d8c6-4cc8-43f6-bf94-79b8403d9cf1	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/c82e6b2b-b9fe-4531-4d68-98db2dc53900/public	\N	\N	82	2026-04-04 15:33:35.215272	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
3c1a3ffe-79ee-4c33-978e-101adcbfb7a8	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/4e21fa31-b028-4f02-a297-9162a0f63700/public	\N	\N	87	2026-04-04 15:33:46.688264	2019-01-11 15:55:50	FUJIFILM GFX 50R	Fujinon GF45mm F2.8 R WR	ISO 2500	1/34s	f/5.6	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
e98809e1-4c1b-4428-9774-a533574cbc5b	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/69bb7b3f-e3e5-4dc9-bbb8-1ec88005d200/public	\N	\N	92	2026-04-04 15:33:58.061608	2019-04-30 12:00:39	FUJIFILM GFX 50R	Fujinon GF45mm F2.8 R WR	ISO 400	1/1000s	f/4.0	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
3ed1efea-b7a2-469f-9282-558178ef6648	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/b89f4c10-0ae6-4f71-eb70-a63d8c3f0400/public	\N	\N	97	2026-04-04 15:34:08.907076	2023-12-25 11:03:21	FUJIFILM GFX 50R	GF50mmF3.5 R LM WR	ISO 800	1/680s	f/4.5	50mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
7c0a94a7-ad73-42f7-bea1-1d55c73ddb10	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/8a16020e-fdfc-4c0a-2d8b-8f02badced00/public	\N	\N	102	2026-04-04 15:34:19.560849	2019-12-29 11:30:15	FUJIFILM GFX 50R	Fujifilm Fujinon GF45mm F2.8 R WR	ISO 800	1/1400s	f/8.0	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
73d71119-8012-4249-bed4-baeccc4d3f35	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/2ac060e0-a964-45e1-4929-84264c1c8500/public	\N	\N	107	2026-04-04 15:34:30.515297	2024-12-12 09:21:22	FUJIFILM GFX 50R	GF50mmF3.5 R LM WR	ISO 400	1/85s	f/5.6	50mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
490fb8e8-10cc-4a9c-9578-30f3a83826a3	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/abbf4c5f-7ab9-43aa-1890-dd6888332f00/public	\N	\N	112	2026-04-04 15:34:40.450359	2019-06-29 09:45:28	FUJIFILM GFX 50R	Fujinon GF45mm F2.8 R WR	ISO 400	1/220s	f/3.6	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
9eeb24db-a2d5-480c-8a8e-d4afd532bbef	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/2c7b47e4-2009-484b-e71e-cded2615c800/public	\N	\N	117	2026-04-04 15:34:51.618785	\N	Nikon LS-50	-- mm f/--	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
f9db8ca1-e5ab-45bd-878f-2c945fdc3813	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/cb476eee-117a-4bdb-052a-cc86c986d600/public	\N	\N	122	2026-04-04 15:35:02.450622	2019-04-30 17:31:34	FUJIFILM GFX 50R	Fujinon GF45mm F2.8 R WR	ISO 320	1/2400s	f/4.0	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
81ec6992-0757-4999-a138-4078279f2ede	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/94fa06d6-9008-4c23-332d-0486dfa65500/public	\N	\N	127	2026-04-04 15:35:15.551733	2024-08-10 19:32:10	FUJIFILM GFX 50R	GF50mmF3.5 R LM WR	ISO 400	0.1s	f/11.0	50mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
9f4380a1-7030-4653-bb44-5c33a05d5826	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/6913b180-8f4b-4bdc-5d14-a24f66e56d00/public	\N	\N	132	2026-04-04 15:35:25.825891	2023-12-25 11:03:57	FUJIFILM GFX 50R	GF50mmF3.5 R LM WR	ISO 800	1/340s	f/5.6	50mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
e8e495ba-212c-49d6-a534-25a03a9c866a	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/c7faf6d4-ab48-4280-6b34-7795357ec900/public	\N	\N	78	2026-04-04 15:33:26.829375	2023-12-25 11:05:51	FUJIFILM GFX 50R	GF50mmF3.5 R LM WR	ISO 400	1/280s	f/3.5	50mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
d2aba139-8870-4e37-88a4-b6807c0aa447	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/27584e69-9ad3-4fe2-ac52-f57937ef0200/public	\N	\N	83	2026-04-04 15:33:37.059595	2019-04-30 12:00:35	FUJIFILM GFX 50R	Fujinon GF45mm F2.8 R WR	ISO 400	1/680s	f/4.0	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
cbaeb8b0-ff0b-4399-937c-a7e42a8ea81c	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/4343b606-92eb-443e-32ba-de7483125c00/public	\N	\N	88	2026-04-04 15:33:49.449307	2024-08-18 11:57:27	FUJIFILM GFX 50R	GF50mmF3.5 R LM WR	ISO 800	1/180s	f/5.6	50mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
f1a5bd4b-4da6-4dc2-9c4f-df860fac0725	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/8905ae75-4448-4323-9ac7-be99ea08f700/public	\N	\N	93	2026-04-04 15:33:59.996413	2019-10-12 19:45:09	FUJIFILM GFX 50R	Fujinon GF45mm F2.8 R WR	ISO 400	1/80s	f/8.0	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
81536ee8-d05e-440e-82cd-6099c1cf8aa1	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/ac7203ed-9ee7-4f28-472a-3def8715a100/public	\N	\N	98	2026-04-04 15:34:10.952005	2023-12-25 11:06:25	FUJIFILM GFX 50R	GF50mmF3.5 R LM WR	ISO 400	1/300s	f/4.5	50mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
5dcbe4d7-2452-453c-8707-d98838a40722	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/4e59f112-2541-4266-f66d-d6d6ae2a9100/public	\N	\N	103	2026-04-04 15:34:21.905403	\N	Nikon LS-50	-- mm f/--	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
37f2bd67-acc4-4505-b24a-e7de9c6f9cf0	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/5791cb1b-728e-4403-187d-129170dd6700/public	\N	\N	108	2026-04-04 15:34:32.564033	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
bc3a5c39-ffc1-41f2-96c2-8e305686dedc	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/29209715-5b70-4a4e-1a96-b9a27709ca00/public	\N	\N	113	2026-04-04 15:34:42.80133	2019-10-12 19:01:33	FUJIFILM GFX 50R	Fujinon GF45mm F2.8 R WR	ISO 400	1/2400s	f/5.6	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
dc319c9a-c1ed-4e9e-8e53-459c2a078206	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/31c6cef1-df6a-45be-d8c9-dc889c196300/public	\N	\N	118	2026-04-04 15:34:54.063425	2024-11-27 13:25:14	FUJIFILM GFX 50R	GF35-70mmF4.5-5.6 WR	ISO 400	1/125s	f/5.6	69mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
64084bde-c601-490f-adb7-36a2a9a379e9	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/422ec194-2053-4d80-2dd1-06f051aeee00/public	\N	\N	123	2026-04-04 15:35:06.662696	\N	Nikon LS-50	-- mm f/--	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
70875cdc-54d4-49a1-b2bf-ee23398374cc	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/22e56b6e-c7c7-476a-d876-196066f7c100/public	\N	\N	128	2026-04-04 15:35:17.514385	2018-12-09 14:58:04	FUJIFILM GFX 50R	Fujinon GF45mm F2.8 R WR	ISO 1600	1/34s	f/10.0	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
c152c41e-7e6f-4a9a-af07-abb634e56a6e	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/9d778822-605a-47b2-b3a5-43e07430eb00/public	\N	\N	79	2026-04-04 15:33:28.922168	2024-12-06 11:14:28	FUJIFILM GFX 50R	GF50mmF3.5 R LM WR	ISO 3200	1/500s	f/4.0	50mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
2d539ac2-1148-4c85-ae17-cdfffeaf9789	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/ec4d5d88-3e5f-4225-8ea2-e6fa51b24700/public	\N	\N	84	2026-04-04 15:33:39.704689	\N	Nikon LS-50	-- mm f/--	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
b3874aa8-17b4-4b02-ab0e-d9a6018712d9	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/2d8b113c-86fa-49e9-05d8-e398400f3300/public	\N	\N	89	2026-04-04 15:33:51.686608	2024-12-12 09:21:09	FUJIFILM GFX 50R	GF50mmF3.5 R LM WR	ISO 400	1/210s	f/5.6	50mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
3e9b2fa7-1b68-4123-80c1-76470392f34d	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/2a32e1ca-9cf9-4acc-b73e-bfe0240ee200/public	\N	\N	94	2026-04-04 15:34:02.018363	2024-02-28 11:17:57	FUJIFILM GFX 50R	GF35-70mmF4.5-5.6 WR	ISO 400	1/27s	f/5.6	70mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
11fa1d08-3fc0-4033-8c39-fe85def0deac	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/f7b7d7aa-606b-45dc-99e9-a0b270ce0200/public	\N	\N	99	2026-04-04 15:34:12.897693	2024-08-17 11:45:48	FUJIFILM GFX 50R	GF50mmF3.5 R LM WR	ISO 1600	1/110s	f/8.0	50mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
368f39eb-3823-448a-82a3-7ea131eccec6	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/a03740cf-bfe2-477f-3ad7-4de653e84c00/public	\N	\N	104	2026-04-04 15:34:23.956823	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
d86f08e4-2385-4aec-b500-6ef872c0132a	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/a88e5c2b-eaa4-49b8-4d9a-3f87cbb7f200/public	\N	\N	109	2026-04-04 15:34:34.604128	2019-11-01 01:22:53	FUJIFILM GFX 50R	Fujinon GF45mm F2.8 R WR	ISO 6400	1/40s	f/4.0	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
75d376bf-d2e0-42b8-a459-4b956ae723c2	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/dba98bf7-cdfe-483b-7dc9-00d15951eb00/public	\N	\N	114	2026-04-04 15:34:45.566923	\N	Nikon LS-50	-- mm f/--	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
3ef16c10-9f12-443c-adb6-cdbef420d5f0	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/5d6c345a-a320-4f7a-15e8-a08df9930500/public	\N	\N	119	2026-04-04 15:34:55.980903	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
f81f27d2-c8a2-47b4-a42a-834d29b8a6ae	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/ef7d660e-eea8-4a1c-9b30-1b592fd94e00/public	\N	\N	124	2026-04-04 15:35:09.319452	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
3dec31db-8270-4352-affd-83f5b92065f5	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/5f4fe71d-63ab-461a-72e1-db57f68dfa00/public	\N	\N	129	2026-04-04 15:35:19.58246	2019-06-29 12:40:10	FUJIFILM GFX 50R	Fujinon GF45mm F2.8 R WR	ISO 400	1/210s	f/2.8	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
d7c0a6ea-e061-4d38-84dc-2fba345c584c	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/3428aef7-1a2b-4fc1-613f-b79699dfc300/public	\N	\N	80	2026-04-04 15:33:31.12084	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
b1ee7b57-715f-4248-b88d-798bd26ad912	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/5643cb74-c6ce-4850-b4b3-aa0766acd200/public	\N	\N	85	2026-04-04 15:33:42.282175	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
19974ada-03b8-49ff-a6dd-399f2b980688	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/12e652a6-9788-4459-bb66-210908e58f00/public	\N	\N	90	2026-04-04 15:33:54.124605	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
17e1056c-8c45-4bd4-9fb6-266d37753351	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/115183aa-fb4d-4d4d-1fa8-c08326922500/public	\N	\N	95	2026-04-04 15:34:04.603643	2024-02-28 11:03:23	FUJIFILM GFX 50R	GF35-70mmF4.5-5.6 WR	ISO 1600	1/100s	f/8.0	35mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
56abc330-e11b-49fb-be52-e5a5c163d4c8	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/7d2a26f7-955a-4715-f2f6-7c1d74813600/public	\N	\N	100	2026-04-04 15:34:15.662387	\N	Nikon LS-50	-- mm f/--	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
a70c7d5a-1ed1-4c88-9eae-4ec3826cc9d8	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/64e6b717-4347-486a-d77a-2390e261ce00/public	\N	\N	105	2026-04-04 15:34:25.68077	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
e0a30c7f-959b-44fc-abaf-89bf3c8f47d3	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/b4875f1a-f9b2-4457-8ed8-96fbdd81f300/public	\N	\N	110	2026-04-04 15:34:36.352756	2019-07-14 17:29:35	FUJIFILM GFX 50R	Fujinon GF45mm F2.8 R WR	ISO 2500	1/450s	f/2.8	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
104dea03-67a6-450a-8535-439ad6d8de14	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/f99c8e75-2cc9-4544-dd3c-db44e62fe400/public	\N	\N	115	2026-04-04 15:34:47.610619	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
7d4622c0-f3bf-4f11-b633-7de8e3002362	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/dccacefb-3282-4bcf-2594-9ae2a55a4100/public	\N	\N	120	2026-04-04 15:34:58.161209	2019-07-07 10:13:10	FUJIFILM GFX 50R	Fujinon GF45mm F2.8 R WR	ISO 400	1/180s	f/5.6	45mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
eb776482-f024-4aba-82d7-e95c0ffc6f1d	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/846c0d95-c90e-4bc4-fbad-95602d389500/public	\N	\N	125	2026-04-04 15:35:11.31102	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
08e7e8ee-6efa-4045-bc14-4eaea048d3fc	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/a326c12d-4798-413c-b5b2-676818338600/public	\N	\N	130	2026-04-04 15:35:21.711625	2024-12-07 12:31:22	FUJIFILM GFX 50R	GF35-70mmF4.5-5.6 WR	ISO 400	1/600s	f/11.0	35mm	\N	\N	\N	\N	GFX50R_COP_developed	\N
dc050ebe-ac14-4c82-b92c-b8696b0825a2	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/ff25ea0b-d58c-4691-3442-9fd3a965fd00/public	\N	\N	133	2026-04-04 15:39:48.996449	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	최다운_이혜진_결혼식장_꾸미기 사진	\N
4045b994-3a17-4aad-9172-f2fc2dd46c24	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/e613e1ed-8585-4c5e-3964-3b09f9d32700/public	\N	\N	134	2026-04-04 15:39:50.934286	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	최다운_이혜진_결혼식장_꾸미기 사진	\N
7424901d-17dd-43ac-bef2-9c26e0a7c3e5	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/ca77ed8b-458c-4604-2412-b8ea4cfe6400/public	\N	\N	135	2026-04-04 15:39:54.756942	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	최다운_이혜진_결혼식장_꾸미기 사진	\N
7f803cb7-8dbf-4502-8a6e-143bea9933fc	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/c1389e06-007e-41c0-0555-781d45915800/public	\N	\N	136	2026-04-04 15:39:56.356069	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	최다운_이혜진_결혼식장_꾸미기 사진	\N
d08a4eb9-1c82-40c8-8659-667c73ea7225	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/2d8f02eb-cd3a-438c-98b4-a7b9772b7a00/public	\N	\N	137	2026-04-04 15:39:58.326322	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	최다운_이혜진_결혼식장_꾸미기 사진	\N
4460b1e4-b57c-4e2e-878f-83b92c494bbc	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/6f66ce10-f400-46cc-19a9-4725bfcfa200/public	\N	\N	138	2026-04-04 15:40:00.562537	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	최다운_이혜진_결혼식장_꾸미기 사진	\N
d17c627c-5543-49b1-a245-52e047e3e0b6	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/0ce62d4f-d175-47e1-ff59-84e3d07b7500/public	\N	\N	139	2026-04-04 15:40:03.52199	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	최다운_이혜진_결혼식장_꾸미기 사진	\N
60f30472-3c84-423b-be34-74cee361ba95	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/2af5d93e-9eb9-47e8-4df5-12b89672f200/public	\N	\N	140	2026-04-04 15:40:06.080041	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	최다운_이혜진_결혼식장_꾸미기 사진	\N
003e24c8-807b-4c05-84f6-547ad46bd87c	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/35654b17-4bb7-4d18-f254-c667995b3400/public	\N	\N	141	2026-04-04 15:40:08.032497	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	최다운_이혜진_결혼식장_꾸미기 사진	\N
fcd23b5b-1e28-401e-b638-c1531b39e53e	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/e59b8bc6-ff28-4988-ad95-28b7515e6c00/public	\N	\N	142	2026-04-04 15:40:09.665198	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	최다운_이혜진_결혼식장_꾸미기 사진	\N
39f1d2f3-194e-4a0c-9772-11ae1f9b82b9	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/5b970854-b321-4ad5-dc3c-502ee078c500/public	\N	\N	143	2026-04-04 15:40:11.309233	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	최다운_이혜진_결혼식장_꾸미기 사진	\N
b9fb822c-b577-4fe0-a46d-a02bb1437f12	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/3535430e-e6e7-461a-69b3-0087dca54400/public	\N	\N	144	2026-04-04 15:40:12.845069	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	최다운_이혜진_결혼식장_꾸미기 사진	\N
b7a0cfe8-80ec-4bc1-be2d-b325e1dd4736	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/b39810ce-d3b1-4e47-6f3e-df1c17662400/public	\N	\N	145	2026-04-04 15:40:14.490625	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	최다운_이혜진_결혼식장_꾸미기 사진	\N
a1c0b548-2215-4014-a9b2-8429df68d727	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/3557a663-135c-47c0-b0ed-dca3753c4d00/public	\N	\N	146	2026-04-04 15:40:16.993346	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	최다운_이혜진_결혼식장_꾸미기 사진	\N
9e0dca58-b04b-4f34-b96e-6592e13230ec	74b252ee-b975-4a09-9493-da24d7fe285c	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/c44ac879-2684-457e-0fde-41842a0d7200/public	\N	\N	17	2026-04-04 15:31:12.472139	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GFX50R_COP_developed	\N
\.


--
-- Data for Name: pitches; Type: TABLE DATA; Schema: public; Owner: fotpm_user
--

COPY public.pitches (id, project_id, media_name, editor_name, editor_email, sent_date, status, note, created_at) FROM stdin;
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: fotpm_user
--

COPY public.projects (id, title, title_en, description, description_en, status, cover_image_url, location, shot_date, is_public, created_at, updated_at, deleted_at) FROM stdin;
74b252ee-b975-4a09-9493-da24d7fe285c	GFX Test		GFX 파일 정리 테스트		IN_PROGRESS	https://imagedelivery.net/IlNDDkUU6uQ47m9Ef8lhvw/0173bc30-2a05-4852-7b28-fc0606dcd800/public		\N	false	2026-04-04 14:59:47.142685	2026-04-04 18:12:31.842043	\N
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: fotpm_user
--

COPY public.settings (key, value) FROM stdin;
color_label_yellow	보류
delivery_tag_color	purple
portfolio_theme	light
admin_password_hash	$2b$12$svFXj0Jhzj0u.dbqwu2UEuLrwa9OvbgYY6ZcVzydiv9T9fLkg.6MG
color_label_blue	외부 공유
color_label_green	1차 선택
color_label_purple	최종 선택
color_label_red	제외
default_grid_cols	3
default_show_exif	true
\.


--
-- Name: chapter_photos chapter_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: fotpm_user
--

ALTER TABLE ONLY public.chapter_photos
    ADD CONSTRAINT chapter_photos_pkey PRIMARY KEY (id);


--
-- Name: chapters chapters_pkey; Type: CONSTRAINT; Schema: public; Owner: fotpm_user
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_pkey PRIMARY KEY (id);


--
-- Name: delivery_links delivery_links_pkey; Type: CONSTRAINT; Schema: public; Owner: fotpm_user
--

ALTER TABLE ONLY public.delivery_links
    ADD CONSTRAINT delivery_links_pkey PRIMARY KEY (id);


--
-- Name: delivery_selections delivery_selections_pkey; Type: CONSTRAINT; Schema: public; Owner: fotpm_user
--

ALTER TABLE ONLY public.delivery_selections
    ADD CONSTRAINT delivery_selections_pkey PRIMARY KEY (id);


--
-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: public; Owner: fotpm_user
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);


--
-- Name: photos photos_pkey; Type: CONSTRAINT; Schema: public; Owner: fotpm_user
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_pkey PRIMARY KEY (id);


--
-- Name: pitches pitches_pkey; Type: CONSTRAINT; Schema: public; Owner: fotpm_user
--

ALTER TABLE ONLY public.pitches
    ADD CONSTRAINT pitches_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: fotpm_user
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: fotpm_user
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- Name: chapter_photos chapter_photos_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fotpm_user
--

ALTER TABLE ONLY public.chapter_photos
    ADD CONSTRAINT chapter_photos_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id);


--
-- Name: chapter_photos chapter_photos_photo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fotpm_user
--

ALTER TABLE ONLY public.chapter_photos
    ADD CONSTRAINT chapter_photos_photo_id_fkey FOREIGN KEY (photo_id) REFERENCES public.photos(id);


--
-- Name: chapters chapters_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fotpm_user
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: delivery_links delivery_links_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fotpm_user
--

ALTER TABLE ONLY public.delivery_links
    ADD CONSTRAINT delivery_links_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: delivery_selections delivery_selections_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fotpm_user
--

ALTER TABLE ONLY public.delivery_selections
    ADD CONSTRAINT delivery_selections_link_id_fkey FOREIGN KEY (link_id) REFERENCES public.delivery_links(id);


--
-- Name: delivery_selections delivery_selections_photo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fotpm_user
--

ALTER TABLE ONLY public.delivery_selections
    ADD CONSTRAINT delivery_selections_photo_id_fkey FOREIGN KEY (photo_id) REFERENCES public.photos(id);


--
-- Name: chapters fk_parent_chapter; Type: FK CONSTRAINT; Schema: public; Owner: fotpm_user
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT fk_parent_chapter FOREIGN KEY (parent_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: notes notes_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fotpm_user
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: photos photos_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fotpm_user
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: pitches pitches_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fotpm_user
--

ALTER TABLE ONLY public.pitches
    ADD CONSTRAINT pitches_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 8rMwDv17IuiFdFUO7oepupSGhZ50GJwl2sQVy0RITqLxeUDW8yK3O6GEqoRtjCd

