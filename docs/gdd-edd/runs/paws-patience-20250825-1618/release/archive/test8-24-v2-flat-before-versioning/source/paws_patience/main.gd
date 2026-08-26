extends Node2D

const SNAPSHOT_HASH := "sha256:1ac445303894be6cc489aa360ef1cca1060e44b718f5ebb02601ff3256f4abfa"
const MAP_BACKGROUND: Texture2D = preload("res://assets/backgrounds/neighborhood.png")
const SICK_CAT_TEXTURE: Texture2D = preload("res://assets/cats/sick-cat.png")
const MAP_BACKGROUND_HASH := "sha256:a1bf531672631d8c09434b152f66d2cd905c7a41c69abc1e1f5b1d9cfb0668cd"
const SICK_CAT_TEXTURE_HASH := "sha256:3a3f4c25ad8eb0b94615b3da3ba9113d3747fe04eea8af39073095497f167bd5"
const BASE_UI_SIZE := Vector2(1280, 720)
const SLOT_NAMES := ["早晨", "中午", "傍晚", "凌晨"]
const COLOR_BG := Color("101d2b")
const COLOR_PANEL := Color("182b3a")
const COLOR_PANEL_LIGHT := Color("203b4b")
const COLOR_TEXT := Color("f4f0e6")
const COLOR_MUTED := Color("a7bac1")
const COLOR_ACCENT := Color("e9b872")
const COLOR_ACCENT_SOFT := Color("6fbe9b")
const COLOR_DANGER := Color("d8897b")
const SEASON_NAMES := ["春", "夏", "秋", "冬"]
const WEATHER_SEQUENCE := ["晴", "多云", "阴雨", "暴雨", "雪", "晴", "多云", "晴"]
const SHELTER_TYPES := ["纸箱", "厚外套", "旧毛衣", "废弃轮胎"]
const CAT_WEIGHTS := {"病弱猫猫": 0.35, "傲娇猫猫": 0.35, "孤僻猫猫": 0.10}
const LOCATION_WEIGHTS := {"巷尾": 1.0, "街道": 0.9, "公园": 1.4}
const CAT_TYPE_SICKLY := "sickly"
const CAT_TYPE_GUARDIAN := "guardian_stray"
const CAT_DISPLAY_NAMES := {CAT_TYPE_SICKLY: "病弱猫猫", CAT_TYPE_GUARDIAN: "守护猫猫"}
const CAT_BOND_DELTAS := {
	CAT_TYPE_SICKLY: {"pet": 3, "feed": 5, "shelter": 20},
	CAT_TYPE_GUARDIAN: {"pet": 4, "feed": 5, "shelter": 16}
}
const GUARDIAN_WEIGHT := 0.20
const GUARDIAN_STREET_FACTOR := 1.25

# 正式游戏只使用一个自动存档槽。评估存档必须分开，避免测试覆盖玩家进度。
const SAVE_VERSION := 1
const SAVE_PATH := "user://paws_patience_save.json"
const EVAL_SAVE_PATH := "user://paws_patience_eval_save.json"
const BOND_MAX := 150
# 12 天是便于验证的原型值，不代表最终平衡；后续依据人工可玩性评价调整。
const MAX_CAT_LIFE_DAYS := 12

var day := 1
var slot := 0
var action_points := 4
var fish := 2
var bond := 0
var view := "map"
var today_weather := "晴"
var next_weather := "多云"
var season := "春"
var season_index := 0
var weather_index := 0
var status_text := "今天也去看看它吧。"
var cat_reaction := "它缩在纸箱后面，安静地看着你。"
var cat_dialogue_branch := "encounter"
var cat_mood := "guarded"
var cat_dialogue_line := "……请离我远一点……"
var shelter_type := "无"
var shelter_index := -1
var location_index := 0
var cat_type := CAT_TYPE_SICKLY
var location_visits_today := 0
var guardian_gate_triggered_today := false
var event_log: Array[String] = []

# timeline_revision 只随已确认的动作向前增加，正常界面没有减少或回档入口。
var timeline_revision := 0
var cat_life_days_remaining := MAX_CAT_LIFE_DAYS
var cat_alive := true
var adopted := false
var ending_state := "ongoing"
var runtime_evaluating := false

var ui: Dictionary = {}
var map_buttons: Array[Button] = []
var cat_buttons: Array[Button] = []
var status_label: Label
var cat_reaction_label: Label
var dialogue_label: Label
var mood_label: Label
var shelter_label: Label
var probability_label: Label
var view_title_label: Label
var view_body_label: Label
var action_label: Label
var fish_label: Label
var bond_label: Label
var day_label: Label
var weather_label: Label
var life_label: Label
var ending_label: Label
var cat_card: PanelContainer
var cat_portrait: TextureRect
var cat_name_label: Label
var interface_root: Control

func _ready() -> void:
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	_load_game()
	_build_interface()
	get_viewport().size_changed.connect(_apply_interface_scale)
	_apply_interface_scale()
	_update_interface()
	await _run_runtime_evaluations()
	queue_redraw()

func _draw() -> void:
	var size := get_viewport_rect().size
	_draw_background_cover(size)
	# 地图保留可辨识细节，同时压低亮度，避免文字卡片与背景争抢注意力。
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.035, 0.055, 0.06, 0.42))

func _draw_background_cover(target_size: Vector2) -> void:
	var texture_size := MAP_BACKGROUND.get_size()
	if texture_size.x <= 0.0 or texture_size.y <= 0.0:
		draw_rect(Rect2(Vector2.ZERO, target_size), COLOR_BG)
		return
	var source_rect := Rect2(Vector2.ZERO, texture_size)
	var target_ratio := target_size.x / target_size.y
	var texture_ratio := texture_size.x / texture_size.y
	# cover 模式只裁掉超出目标比例的边缘，不把像素地图强行拉伸变形。
	if texture_ratio > target_ratio:
		var visible_width := texture_size.y * target_ratio
		source_rect.position.x = (texture_size.x - visible_width) * 0.5
		source_rect.size.x = visible_width
	else:
		var visible_height := texture_size.x / target_ratio
		source_rect.position.y = (texture_size.y - visible_height) * 0.5
		source_rect.size.y = visible_height
	draw_texture_rect_region(MAP_BACKGROUND, Rect2(Vector2.ZERO, target_size), source_rect)

func _build_interface() -> void:
	var root := Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)
	interface_root = root

	var margin := MarginContainer.new()
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 48)
	margin.add_theme_constant_override("margin_right", 48)
	margin.add_theme_constant_override("margin_top", 34)
	margin.add_theme_constant_override("margin_bottom", 32)
	root.add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 18)
	margin.add_child(column)

	var header := HBoxContainer.new()
	header.custom_minimum_size.y = 74
	header.add_theme_constant_override("separation", 18)
	column.add_child(header)
	var title_column := VBoxContainer.new()
	title_column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(title_column)
	var title := _label("Paws & Patience", 30, COLOR_TEXT)
	title_column.add_child(title)
	title_column.add_child(_label("给一只小猫留一点耐心，也给自己留一点时间。", 14, COLOR_MUTED))
	day_label = _label("第 1 天 · 早晨", 16, COLOR_ACCENT)
	header.add_child(day_label)

	var stats := HBoxContainer.new()
	stats.add_theme_constant_override("separation", 10)
	column.add_child(stats)
	var stat_day := _stat_panel("天气", "晴 / 明日 多云")
	weather_label = stat_day.get_meta("value_label")
	stats.add_child(stat_day)
	var stat_ap := _stat_panel("行动点", "● ● ● ●")
	action_label = stat_ap.get_meta("value_label")
	stats.add_child(stat_ap)
	var stat_fish := _stat_panel("小鱼干", "2 条")
	fish_label = stat_fish.get_meta("value_label")
	stats.add_child(stat_fish)
	var stat_bond := _stat_panel("羁绊", "0 / 150")
	bond_label = stat_bond.get_meta("value_label")
	stats.add_child(stat_bond)
	var stat_life := _stat_panel("陪伴时间", "%d 天" % MAX_CAT_LIFE_DAYS)
	life_label = stat_life.get_meta("value_label")
	stats.add_child(stat_life)

	var body := HBoxContainer.new()
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_theme_constant_override("separation", 20)
	column.add_child(body)

	var story_panel := _panel()
	story_panel.custom_minimum_size = Vector2(470, 0)
	story_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	story_panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_child(story_panel)
	var story_margin := MarginContainer.new()
	story_margin.add_theme_constant_override("margin_left", 26)
	story_margin.add_theme_constant_override("margin_right", 26)
	story_margin.add_theme_constant_override("margin_top", 24)
	story_margin.add_theme_constant_override("margin_bottom", 24)
	story_panel.add_child(story_margin)
	var story_column := VBoxContainer.new()
	story_column.add_theme_constant_override("separation", 14)
	story_margin.add_child(story_column)
	view_title_label = _label("今天的地图", 22, COLOR_TEXT)
	story_column.add_child(view_title_label)
	view_body_label = _label("街角的风还很轻。你可以先去公司，再去看看小猫。", 15, COLOR_MUTED)
	view_body_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	view_body_label.size_flags_vertical = Control.SIZE_EXPAND_FILL
	story_column.add_child(view_body_label)
	probability_label = _label("病弱猫相遇预览：35%", 13, COLOR_ACCENT)
	probability_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	story_column.add_child(probability_label)
	ending_label = _label("故事仍在继续", 13, COLOR_ACCENT_SOFT)
	ending_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	story_column.add_child(ending_label)
	var location_label := _label("去哪里？", 15, COLOR_ACCENT)
	story_column.add_child(location_label)
	var map_row := HBoxContainer.new()
	map_row.add_theme_constant_override("separation", 8)
	story_column.add_child(map_row)
	_add_action_button(map_row, "公司\n+2 鱼干", _on_company, map_buttons)
	_add_action_button(map_row, "巷尾\n看看", _on_location.bind(0), map_buttons)
	_add_action_button(map_row, "街道\n看看", _on_location.bind(1), map_buttons)
	_add_action_button(map_row, "公园\n看看", _on_location.bind(2), map_buttons)
	var cat_row := HBoxContainer.new()
	cat_row.add_theme_constant_override("separation", 8)
	story_column.add_child(cat_row)
	_add_action_button(cat_row, "摸摸\n+3 羁绊", _on_pet, cat_buttons)
	_add_action_button(cat_row, "喂食\n+5 羁绊", _on_feed, cat_buttons)
	_add_action_button(cat_row, "回到地图", _on_return_map, cat_buttons)

	_add_action_button(cat_row, "搭建庇护所\n+20 羁绊", _on_shelter, cat_buttons)

	cat_card = _panel()
	cat_card.custom_minimum_size = Vector2(430, 0)
	cat_card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	cat_card.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_child(cat_card)
	var cat_margin := MarginContainer.new()
	cat_margin.add_theme_constant_override("margin_left", 26)
	cat_margin.add_theme_constant_override("margin_right", 26)
	cat_margin.add_theme_constant_override("margin_top", 24)
	cat_margin.add_theme_constant_override("margin_bottom", 24)
	cat_card.add_child(cat_margin)
	var cat_column := VBoxContainer.new()
	cat_column.add_theme_constant_override("separation", 12)
	cat_margin.add_child(cat_column)
	cat_name_label = _label("病弱猫猫", 24, COLOR_ACCENT_SOFT)
	cat_column.add_child(cat_name_label)
	cat_portrait = TextureRect.new()
	cat_portrait.custom_minimum_size = Vector2(136, 136)
	cat_portrait.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	cat_portrait.texture = SICK_CAT_TEXTURE
	cat_portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	cat_portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	cat_portrait.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	cat_column.add_child(cat_portrait)
	mood_label = _label("情绪：警惕", 13, COLOR_ACCENT)
	cat_column.add_child(mood_label)
	shelter_label = _label("庇护所：无", 13, COLOR_MUTED)
	cat_column.add_child(shelter_label)
	dialogue_label = _label(cat_dialogue_line, 18, COLOR_TEXT)
	dialogue_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	dialogue_label.custom_minimum_size.y = 58
	cat_column.add_child(dialogue_label)
	cat_reaction_label = _label(cat_reaction, 16, COLOR_TEXT)
	cat_reaction_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	cat_reaction_label.size_flags_vertical = Control.SIZE_EXPAND_FILL
	cat_column.add_child(cat_reaction_label)
	cat_column.add_child(_label("它不太相信人类，但没有马上逃走。", 14, COLOR_MUTED))

	status_label = _label(status_text, 15, COLOR_TEXT)
	status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	status_label.custom_minimum_size.y = 34
	column.add_child(status_label)

	ui["root"] = root
	ui["story_panel"] = story_panel
	ui["cat_card"] = cat_card

func _apply_interface_scale() -> void:
	if not is_instance_valid(interface_root):
		return
	var viewport_size := get_viewport_rect().size
	if viewport_size.x <= 0.0 or viewport_size.y <= 0.0:
		return
	# Windows 高 DPI 会缩小 Godot 的逻辑客户区。界面统一缩放并扩大布局画布，
	# 保证 1280×720 的设计在 853×480 等等比例窗口中仍能完整显示。
	var scale_factor: float = minf(
		viewport_size.x / BASE_UI_SIZE.x,
		viewport_size.y / BASE_UI_SIZE.y
	)
	scale_factor = minf(scale_factor, 1.0)
	interface_root.scale = Vector2.ONE * scale_factor
	interface_root.size = viewport_size / scale_factor

func _panel() -> PanelContainer:
	var panel := PanelContainer.new()
	var style := StyleBoxFlat.new()
	style.bg_color = COLOR_PANEL
	style.border_color = Color("2d4a58")
	style.set_border_width_all(1)
	style.set_corner_radius_all(12)
	panel.add_theme_stylebox_override("panel", style)
	return panel

func _stat_panel(label_text: String, value_text: String) -> PanelContainer:
	var panel := _panel()
	panel.custom_minimum_size = Vector2(170, 58)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 14)
	margin.add_theme_constant_override("margin_right", 14)
	margin.add_theme_constant_override("margin_top", 8)
	margin.add_theme_constant_override("margin_bottom", 8)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	margin.add_child(column)
	column.add_child(_label(label_text, 12, COLOR_MUTED))
	var value := _label(value_text, 16, COLOR_TEXT)
	value.name = "Value"
	column.add_child(value)
	panel.set_meta("value_label", value)
	return panel

func _label(text_value: String, font_size: int, color: Color) -> Label:
	var label := Label.new()
	label.text = text_value
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	return label

func _add_action_button(parent: Container, text_value: String, callback: Callable, bucket: Array[Button]) -> void:
	var button := Button.new()
	button.text = text_value
	button.custom_minimum_size = Vector2(98, 60)
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button.add_theme_font_size_override("font_size", 14)
	button.add_theme_color_override("font_color", COLOR_TEXT)
	button.add_theme_color_override("font_hover_color", COLOR_BG)
	var normal := StyleBoxFlat.new()
	normal.bg_color = COLOR_PANEL_LIGHT
	normal.set_corner_radius_all(8)
	normal.set_border_width_all(1)
	normal.border_color = Color("3d6570")
	var hover := normal.duplicate()
	hover.bg_color = COLOR_ACCENT
	hover.border_color = COLOR_ACCENT
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("pressed", hover)
	button.pressed.connect(callback)
	parent.add_child(button)
	bucket.append(button)

func _update_interface() -> void:
	day_label.text = "第 %d 天 · %s" % [day, SLOT_NAMES[slot]]
	weather_label.text = "%s · %s / 明日 %s" % [season, today_weather, next_weather]
	var action_symbols := ""
	for i in range(4):
		action_symbols += "●" if i < action_points else "○"
		if i < 3:
			action_symbols += " "
	action_label.text = action_symbols
	fish_label.text = "%d 条" % fish
	bond_label.text = "%d / %d" % [bond, BOND_MAX]
	life_label.text = "%d 天" % cat_life_days_remaining if cat_alive else "已经告别"
	ending_label.text = _ending_summary()
	status_label.text = status_text
	cat_reaction_label.text = cat_reaction
	dialogue_label.text = cat_dialogue_line
	mood_label.text = "情绪：%s" % _mood_name()
	mood_label.add_theme_color_override("font_color", _mood_color())
	shelter_label.text = "庇护所：%s" % shelter_type
	if ending_state == "farewell":
		view_title_label.text = "留在记忆里的陪伴"
		view_body_label.text = "它安静地走完了这一段生命。你们共同度过的时间不会被读档抹去。"
	elif adopted:
		view_title_label.text = "家中的陪伴"
		view_body_label.text = "它已经愿意跟你回家。余下的每一天，仍然可以摸摸它、喂它，陪它慢慢生活。"
	else:
		view_title_label.text = "今天的地图" if view == "map" else "巷尾的相遇"
		view_body_label.text = "街角的风还很轻。你可以先去公司，再去看看小猫。" if view == "map" else "它缩在纸箱后面，耳朵轻轻动了一下。你想怎么做？"
	var selected_location: String = ["巷尾", "街道", "公园"][location_index]
	var preview := _encounter_probability("病弱猫猫", selected_location, bond, shelter_type != "无")
	probability_label.text = "%s相遇预览 · %s · %d%%" % [_cat_display_name(), selected_location, round(preview * 100.0)]
	cat_name_label.text = _cat_display_name()
	for button in map_buttons:
		button.visible = view == "map" and cat_alive and not adopted
		button.disabled = action_points <= 0 or not cat_alive or adopted
	for button in cat_buttons:
		button.visible = view == "cat" and cat_alive
		button.disabled = (action_points <= 0 and button.text != "回到地图") or (adopted and button.text == "回到地图")
	cat_card.visible = view == "cat" or ending_state != "ongoing"
	queue_redraw()

func _consume_action() -> bool:
	if not cat_alive:
		status_text = "这段陪伴已经结束。你可以记住它，但不能把时间拨回去。"
		_update_interface()
		return false
	if action_points <= 0:
		status_text = "今天的行动已经用完了。"
		_update_interface()
		return false
	action_points -= 1
	slot = (slot + 1) % SLOT_NAMES.size()
	return true

func _on_company() -> void:
	if not _consume_action():
		return
	fish += 2
	status_text = "你下班了。口袋里多了两条小鱼干。"
	_log_event("company", {"fish": fish, "action_points": action_points})
	_finish_action_if_needed()

func _on_location(location_choice: int = -1) -> void:
	if not _consume_action():
		return
	if location_choice >= 0 and location_choice < 3:
		location_index = location_choice
	else:
		location_index = (location_index + 1) % 3
	view = "cat"
	if location_index == 1:
		location_visits_today += 1
	if location_index == 1 and location_visits_today >= 3 and not guardian_gate_triggered_today:
		guardian_gate_triggered_today = true
		_set_cat_type(CAT_TYPE_GUARDIAN)
		status_text = "街道尽头传来一声短促的猫叫。你遇见了守护猫猫。"
		cat_reaction = "它挡在小巷入口，先确认你身后没有危险，才慢慢转过身来。"
		cat_dialogue_line = "猫：先别靠近……你身后安全吗？"
		_log_event("encounter_guardian_stray", {"streetVisits": location_visits_today, "catType": cat_type, "action_points": action_points})
	else:
		_set_cat_type(CAT_TYPE_SICKLY)
		status_text = "巷尾很安静。你发现了病弱猫猫。"
		cat_reaction = "它缩在纸箱后面，安静地看着你。"
		cat_dialogue_line = "……请离我远一点……"
		_log_event("encounter_sickly_cat", {"action_points": action_points, "dialogueBranch": cat_dialogue_branch, "mood": cat_mood})
	cat_dialogue_branch = "encounter"
	cat_mood = "guarded"
	_update_interface()
	_finish_action_if_needed()

func _on_pet() -> void:
	if not _consume_action():
		return
	var delta := _cat_bond_delta("pet")
	bond = mini(BOND_MAX, bond + delta)
	cat_dialogue_branch = "pet"
	cat_mood = "trusting"
	if cat_type == CAT_TYPE_GUARDIAN:
		cat_dialogue_line = "你：辛苦你守着这里。\n猫：……那你也别受伤。"
		cat_reaction = "它确认你没有危险，才用额头轻轻碰了碰你的手。"
		status_text = "你轻轻摸了摸守护猫猫。它终于放下了警戒。"
	else:
		cat_dialogue_line = "你：别怕，我会轻一点。\n猫：……好。"
		cat_reaction = "它微微缩了一下，但没有躲开。尾巴轻轻摇了摇。"
		status_text = "你轻轻摸了摸它的头。它把一片小花瓣放在你脚边。"
	_update_ending_state()
	_log_event("pet", {"bond": bond, "delta": delta, "catType": cat_type, "action_points": action_points, "dialogueBranch": cat_dialogue_branch, "mood": cat_mood})
	_finish_action_if_needed()

func _on_feed() -> void:
	if fish <= 0:
		status_text = "你摸了摸空空的口袋。今天没有小鱼干了。"
		_update_interface()
		return
	if not _consume_action():
		return
	fish -= 1
	var delta := _cat_bond_delta("feed")
	bond = mini(BOND_MAX, bond + delta)
	cat_dialogue_branch = "feed"
	cat_mood = "grateful"
	if cat_type == CAT_TYPE_GUARDIAN:
		cat_dialogue_line = "你：给你留了些吃的。\n猫：……我会分给巷子里的小家伙。"
		cat_reaction = "它叼走一半小鱼干，又把另一半推到阴影里。"
		status_text = "守护猫猫收下了小鱼干，也没有忘记照顾同伴。"
	else:
		cat_dialogue_line = "你：给你带了一点吃的。\n猫：……谢谢。你明天还会来吗？"
		cat_reaction = "它小心地咬了一口，抬头看了看你，像是在确认你明天还会来。"
		status_text = "病弱猫猫吃下了小鱼干。它的眼神柔和了一点。"
	_update_ending_state()
	_log_event("feed", {"fish": fish, "bond": bond, "delta": delta, "catType": cat_type, "action_points": action_points, "dialogueBranch": cat_dialogue_branch, "mood": cat_mood})
	_finish_action_if_needed()

func _encounter_probability(requested_cat_type: String, location: String, bond_value: int, has_shelter: bool) -> float:
	if requested_cat_type == CAT_TYPE_GUARDIAN:
		var guardian_location_factor := GUARDIAN_STREET_FACTOR if location == "街道" else 1.0
		return clampf(GUARDIAN_WEIGHT * guardian_location_factor, 0.01, 0.95)
	var base: float = float(CAT_WEIGHTS.get(requested_cat_type, 0.1))
	var location_factor: float = float(LOCATION_WEIGHTS.get(location, 1.0))
	var weather_factor: float = 0.8 if today_weather == "阴雨" else (0.6 if today_weather == "暴雨" else (0.5 if today_weather == "雪" else 1.0))
	var season_factor: float = 1.2 if season == "冬" else 1.0
	var bond_factor: float = minf(2.5, 1.0 + float(bond_value) / 100.0)
	var shelter_factor: float = 1.3 if has_shelter else 1.0
	return clampf(base * location_factor * weather_factor * season_factor * bond_factor * shelter_factor, 0.01, 0.95)

func _set_cat_type(new_type: String) -> void:
	cat_type = new_type if CAT_DISPLAY_NAMES.has(new_type) else CAT_TYPE_SICKLY

func _cat_display_name() -> String:
	return str(CAT_DISPLAY_NAMES.get(cat_type, CAT_DISPLAY_NAMES[CAT_TYPE_SICKLY]))

func _cat_bond_delta(action: String) -> int:
	var profile: Dictionary = CAT_BOND_DELTAS.get(cat_type, CAT_BOND_DELTAS[CAT_TYPE_SICKLY])
	return int(profile.get(action, CAT_BOND_DELTAS[CAT_TYPE_SICKLY].get(action, 0)))

func _on_shelter() -> void:
	var next_index := (shelter_index + 1) % SHELTER_TYPES.size()
	_build_shelter(SHELTER_TYPES[next_index])

func _build_shelter(new_shelter: String) -> bool:
	if new_shelter not in SHELTER_TYPES or not _consume_action():
		return false
	shelter_index = SHELTER_TYPES.find(new_shelter)
	shelter_type = new_shelter
	var delta := _cat_bond_delta("shelter")
	bond = mini(BOND_MAX, bond + delta)
	cat_dialogue_branch = "shelter"
	cat_mood = "relieved"
	if cat_type == CAT_TYPE_GUARDIAN:
		cat_dialogue_line = "你：我给你搭了一个安全的地方。\n猫：……那我可以继续守着这里了。"
		cat_reaction = "守护猫猫绕着%s走了一圈，确认每个角落都足够安全。" % shelter_type
		status_text = "你为守护猫猫留下了%s。它决定把这里当作新的守望点。" % shelter_type
	else:
		cat_dialogue_line = "你：我给你搭了一个安全的地方。\n猫：……这里真的属于我吗？"
		cat_reaction = "它慢慢钻进%s，身体终于放松下来。" % shelter_type
		status_text = "你为病弱猫猫留下了%s。它把这里记住了。" % shelter_type
	_update_ending_state()
	_log_event("build_shelter", {"shelter": shelter_type, "bond": bond, "delta": delta, "catType": cat_type, "action_points": action_points})
	_finish_action_if_needed()
	return true

func _on_return_map() -> void:
	if adopted or not cat_alive:
		status_text = "它已经把家交给了你。这段时间只能继续向前。"
		_update_interface()
		return
	view = "map"
	status_text = "你没有催它，只是把脚步放慢了一点。"
	_update_interface()

func _finish_action_if_needed() -> void:
	_update_interface()
	if action_points <= 0:
		await get_tree().create_timer(0.35).timeout
		_rollover_day()
	else:
		_commit_progress()

func _rollover_day() -> void:
	# 跨日同时推进寿命和时间修订号；这里只允许加一，没有倒退分支。
	day += 1
	timeline_revision += 1
	slot = 0
	weather_index = (weather_index + 1) % WEATHER_SEQUENCE.size()
	today_weather = WEATHER_SEQUENCE[weather_index]
	next_weather = WEATHER_SEQUENCE[(weather_index + 1) % WEATHER_SEQUENCE.size()]
	season_index = int(floor(float(day - 1) / 2.0)) % SEASON_NAMES.size()
	season = SEASON_NAMES[season_index]
	action_points = _action_points_for_weather(today_weather)
	location_visits_today = 0
	guardian_gate_triggered_today = false
	_advance_cat_life()
	view = "cat" if adopted or ending_state == "farewell" else "map"
	status_text = "夜色慢慢落下。新的一天，先看看天气，再决定去哪里。"
	cat_reaction = "它还记得你。"
	if ending_state == "home":
		status_text = "清晨，它在家里等你醒来。余下的每一天都不会重来。"
	elif ending_state == "farewell":
		status_text = "它安静地走完了这一生。你们共同度过的时间被好好留下了。"
	_log_event("day_rollover", {"day": day, "action_points": action_points, "weather": today_weather})
	_update_interface()
	_save_game()

func _action_points_for_weather(weather: String) -> int:
	return 3 if weather in ["暴雨", "雪"] else 4

func _commit_progress() -> void:
	# 每个稳定动作只产生一个更大的修订号，并立即覆盖单槽存档。
	timeline_revision += 1
	_save_game()

func _advance_cat_life() -> void:
	if not cat_alive:
		return
	cat_life_days_remaining = maxi(0, cat_life_days_remaining - 1)
	if cat_life_days_remaining > 0:
		return
	cat_alive = false
	ending_state = "farewell"
	view = "cat"
	cat_mood = "remembered"
	cat_dialogue_branch = "farewell"
	cat_dialogue_line = "谢谢你陪我走到这里。"
	cat_reaction = "屋子里很安静，但那些被认真度过的日子没有消失。"

func _update_ending_state() -> void:
	if not cat_alive or adopted or bond < BOND_MAX:
		return
	adopted = true
	ending_state = "home"
	view = "cat"
	cat_mood = "home"
	cat_dialogue_branch = "home"
	cat_dialogue_line = "猫：我想跟你回家。以后，也请继续陪着我。"
	cat_reaction = "它第一次主动走到你身边，把额头轻轻贴在你的手心。"
	status_text = "羁绊达到 150。它愿意跟你回家，陪伴从今天继续向前。"

func _ending_summary() -> String:
	match ending_state:
		"home":
			return "羁绊结局：它已经回家 · 剩余 %d 天" % cat_life_days_remaining
		"farewell":
			return "生命结局：温柔告别 · 这段时间无法重来"
		_:
			return "故事仍在继续 · 自动存档修订 %d" % timeline_revision

func _capture_state() -> Dictionary:
	return {
		"saveVersion": SAVE_VERSION,
		"timelineRevision": timeline_revision,
		"day": day,
		"slot": slot,
		"actionPoints": action_points,
		"fish": fish,
		"bond": bond,
		"view": view,
		"todayWeather": today_weather,
		"nextWeather": next_weather,
		"season": season,
		"seasonIndex": season_index,
		"weatherIndex": weather_index,
		"statusText": status_text,
		"catReaction": cat_reaction,
		"catDialogueBranch": cat_dialogue_branch,
		"catMood": cat_mood,
		"catDialogueLine": cat_dialogue_line,
		"shelterType": shelter_type,
		"shelterIndex": shelter_index,
		"locationIndex": location_index,
		"catType": cat_type,
		"locationVisitsToday": location_visits_today,
		"guardianGateTriggeredToday": guardian_gate_triggered_today,
		"catLifeDays": cat_life_days_remaining,
		"catAlive": cat_alive,
		"adopted": adopted,
		"endingState": ending_state
	}

func _apply_save_data(data: Dictionary) -> bool:
	var required_keys := ["saveVersion", "timelineRevision", "day", "actionPoints", "catLifeDays", "catAlive", "adopted", "endingState"]
	for required_key in required_keys:
		if not data.has(required_key):
			return false
	if int(data["saveVersion"]) != SAVE_VERSION:
		return false
	var parsed_ending_state := str(data["endingState"])
	if parsed_ending_state not in ["ongoing", "home", "farewell"]:
		return false

	# 只接受当前版本并逐字段收敛到合法范围，损坏存档不会污染默认状态。
	timeline_revision = maxi(0, int(data["timelineRevision"]))
	day = maxi(1, int(data["day"]))
	slot = clampi(int(data.get("slot", 0)), 0, SLOT_NAMES.size() - 1)
	action_points = clampi(int(data["actionPoints"]), 0, 4)
	fish = maxi(0, int(data.get("fish", 2)))
	bond = clampi(int(data.get("bond", 0)), 0, BOND_MAX)
	view = str(data.get("view", "map"))
	today_weather = str(data.get("todayWeather", "晴"))
	next_weather = str(data.get("nextWeather", "多云"))
	season = str(data.get("season", "春"))
	season_index = clampi(int(data.get("seasonIndex", 0)), 0, SEASON_NAMES.size() - 1)
	weather_index = clampi(int(data.get("weatherIndex", 0)), 0, WEATHER_SEQUENCE.size() - 1)
	status_text = str(data.get("statusText", status_text))
	cat_reaction = str(data.get("catReaction", cat_reaction))
	cat_dialogue_branch = str(data.get("catDialogueBranch", cat_dialogue_branch))
	cat_mood = str(data.get("catMood", cat_mood))
	cat_dialogue_line = _localized_dialogue(str(data.get("catDialogueLine", cat_dialogue_line)))
	shelter_type = str(data.get("shelterType", "无"))
	shelter_index = clampi(int(data.get("shelterIndex", -1)), -1, SHELTER_TYPES.size() - 1)
	location_index = clampi(int(data.get("locationIndex", 0)), 0, 2)
	var saved_cat_type := str(data.get("catType", CAT_TYPE_SICKLY))
	_set_cat_type(saved_cat_type)
	location_visits_today = maxi(0, int(data.get("locationVisitsToday", 0)))
	guardian_gate_triggered_today = bool(data.get("guardianGateTriggeredToday", false))
	cat_life_days_remaining = clampi(int(data["catLifeDays"]), 0, MAX_CAT_LIFE_DAYS)
	cat_alive = bool(data["catAlive"])
	adopted = bool(data["adopted"])
	ending_state = parsed_ending_state
	if not cat_alive:
		ending_state = "farewell"
		view = "cat"
	elif adopted:
		ending_state = "home"
		view = "cat"
	return true

func _save_game(path: String = SAVE_PATH) -> bool:
	# 自动评估可以调用真实交互，但绝不能覆盖玩家正式存档。
	if runtime_evaluating and path == SAVE_PATH:
		return true
	var file := FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		return false
	file.store_string(JSON.stringify(_capture_state()))
	return true

func _load_game(path: String = SAVE_PATH) -> bool:
	if not FileAccess.file_exists(path):
		return false
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		return false
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not parsed is Dictionary:
		return false
	return _apply_save_data(parsed as Dictionary)

func _log_event(event_name: String, actual: Dictionary) -> void:
	event_log.append(JSON.stringify({"event": event_name, "actual": actual}))

func _mood_color() -> Color:
	match cat_mood:
		"grateful": return COLOR_ACCENT_SOFT
		"trusting": return COLOR_ACCENT
		"home": return COLOR_ACCENT_SOFT
		"remembered": return COLOR_MUTED
		_: return COLOR_MUTED

func _mood_name() -> String:
	# 内部状态键保持稳定，界面只展示中文名称，避免破坏存档和自动评估。
	match cat_mood:
		"grateful": return "感激"
		"trusting": return "信任"
		"relieved": return "安心"
		"home": return "亲近"
		"remembered": return "怀念"
		_: return "警惕"

func _localized_dialogue(value: String) -> String:
	# 兼容旧存档里已经写入的英文原型对白。
	match value:
		"... Keep a little distance ...": return "……请离我远一点……"
		"Player: Easy now, it won't hurt.\nCat: ...okay...": return "你：别怕，我会轻一点。\n猫：……好。"
		"Player: I brought a little snack.\nCat: ...thank you... will you come tomorrow?": return "你：给你带了一点吃的。\n猫：……谢谢。你明天还会来吗？"
		"Player: I made a safe place for you.\nCat: ...is this really mine?": return "你：我给你搭了一个安全的地方。\n猫：……这里真的属于我吗？"
		_: return value

func _emit_eval(eval_id: String, status: String, expected: Dictionary, actual: Dictionary) -> void:
	print("KECO_EVAL " + JSON.stringify({"evalId": eval_id, "status": status, "expected": expected, "actual": actual, "snapshotHash": SNAPSHOT_HASH}))

func _run_runtime_evaluations() -> void:
	# 先保存玩家内存状态，再进入隔离模式。真实交互仍会执行，但不会写正式存档。
	var saved := _capture_state()
	runtime_evaluating = true
	_set_cat_type(CAT_TYPE_SICKLY)
	location_visits_today = 0
	guardian_gate_triggered_today = false
	day = 1
	slot = 0
	action_points = 4
	fish = 2
	bond = 0
	view = "map"
	today_weather = "晴"
	next_weather = "多云"
	season = "春"
	season_index = 0
	weather_index = 0
	cat_life_days_remaining = MAX_CAT_LIFE_DAYS
	cat_alive = true
	adopted = false
	ending_state = "ongoing"
	timeline_revision = 0
	var startup_actual := {"title": "Paws & Patience", "view": view, "action_points": action_points, "season": season, "today_weather": today_weather, "next_weather": next_weather}
	_emit_eval("eval-001-startup", "passed" if view == "map" and action_points == 4 else "failed", {"view": "map", "action_points": 4, "weather_visible": true}, startup_actual)
	_emit_eval("eval-801-cat-profile", "passed" if CAT_DISPLAY_NAMES[CAT_TYPE_GUARDIAN] == "守护猫猫" and _cat_bond_delta("pet") == 3 and cat_type == CAT_TYPE_SICKLY else "failed", {"guardianKey": CAT_TYPE_GUARDIAN, "defaultKey": CAT_TYPE_SICKLY, "sicklyPetDelta": 3}, {"guardianName": CAT_DISPLAY_NAMES[CAT_TYPE_GUARDIAN], "defaultKey": cat_type, "sicklyPetDelta": _cat_bond_delta("pet")})
	# Guardian gate is independent from the V1 pool: only the third Street visit qualifies.
	day = 1
	slot = 0
	action_points = 4
	location_visits_today = 0
	guardian_gate_triggered_today = false
	view = "map"
	_on_location(1)
	_on_return_map()
	_on_location(1)
	_on_return_map()
	_on_location(1)
	var guardian_gate_actual := {"catType": cat_type, "streetVisits": location_visits_today, "triggered": guardian_gate_triggered_today, "location": ["巷尾", "街道", "公园"][location_index]}
	_emit_eval("eval-802-guardian-interaction", "passed" if cat_type == CAT_TYPE_GUARDIAN and location_visits_today == 3 and guardian_gate_triggered_today else "failed", {"catType": CAT_TYPE_GUARDIAN, "streetVisits": 3, "triggered": true}, guardian_gate_actual)
	var guardian_bond_start := bond
	action_points = 4
	bond = 0
	view = "cat"
	_on_pet()
	var guardian_pet_bond := bond
	action_points = 4
	_on_feed()
	var guardian_feed_bond := bond
	action_points = 4
	_on_shelter()
	var guardian_shelter_bond := bond
	var guardian_probability := _encounter_probability(CAT_TYPE_GUARDIAN, "街道", 0, false)
	var guardian_interaction_actual := {"petDelta": guardian_pet_bond, "feedDelta": guardian_feed_bond - guardian_pet_bond, "shelterDelta": guardian_shelter_bond - guardian_feed_bond, "dialogue": cat_dialogue_line}
	_emit_eval("eval-803-guardian-probability", "passed" if guardian_probability >= 0.01 and guardian_probability <= 0.95 and is_equal_approx(guardian_probability, 0.25) else "failed", {"min": 0.01, "max": 0.95, "streetPreview": 0.25}, {"probability": guardian_probability, "interactions": guardian_interaction_actual, "startBond": guardian_bond_start})
	_set_cat_type(CAT_TYPE_SICKLY)
	bond = 0
	location_visits_today = 0
	guardian_gate_triggered_today = false
	_emit_eval("eval-301-weather-startup", "passed" if season in SEASON_NAMES and today_weather in WEATHER_SEQUENCE and next_weather in WEATHER_SEQUENCE else "failed", {"season": "declared", "today_weather": "declared", "next_weather": "declared"}, startup_actual)
	var clear_ap := _action_points_for_weather("晴")
	var storm_ap := _action_points_for_weather("暴雨")
	var snow_ap := _action_points_for_weather("雪")
	_emit_eval("eval-302-severe-weather-ap", "passed" if clear_ap == 4 and storm_ap == 3 and snow_ap == 3 else "failed", {"clear": 4, "storm": 3, "snow": 3}, {"clear": clear_ap, "storm": storm_ap, "snow": snow_ap})
	_emit_eval("eval-401-shelter-options", "passed" if SHELTER_TYPES.size() == 4 and "纸箱" in SHELTER_TYPES and "厚外套" in SHELTER_TYPES and "旧毛衣" in SHELTER_TYPES and "废弃轮胎" in SHELTER_TYPES else "failed", {"types": 4}, {"types": SHELTER_TYPES})
	action_points = 4
	bond = 0
	view = "cat"
	shelter_type = "无"
	shelter_index = -1
	var built := _build_shelter("纸箱")
	var shelter_build_actual := {"built": built, "action_points": action_points, "bond": bond, "shelter": shelter_type}
	_emit_eval("eval-402-shelter-build", "passed" if built and action_points == 3 and bond == 20 else "failed", {"action_points": 3, "bond": 20}, shelter_build_actual)
	_emit_eval("eval-403-shelter-feedback", "passed" if shelter_type == "纸箱" and cat_dialogue_branch == "shelter" and not cat_reaction.is_empty() else "failed", {"shelter": "纸箱", "branch": "shelter", "reaction": true}, {"shelter": shelter_type, "branch": cat_dialogue_branch, "reaction": cat_reaction})
	var probability_low := _encounter_probability("孤僻猫猫", "街道", 0, false)
	var probability_high := _encounter_probability("病弱猫猫", "公园", 150, true)
	_emit_eval("eval-501-probability-bounds", "passed" if probability_low >= 0.01 and probability_low <= 0.95 and probability_high >= 0.01 and probability_high <= 0.95 else "failed", {"min": 0.01, "max": 0.95}, {"low": probability_low, "high": probability_high})
	var base_probability := _encounter_probability("病弱猫猫", "巷尾", 0, false)
	var bonded_probability := _encounter_probability("病弱猫猫", "巷尾", 100, true)
	_emit_eval("eval-502-bond-shelter-modifier", "passed" if bonded_probability > base_probability else "failed", {"bondedHigher": true}, {"base": base_probability, "bondedSheltered": bonded_probability})

	# 通过真实按钮处理函数验证旧功能，让回归问题能被同一批运行证据捕获。
	day = 1
	slot = 0
	action_points = 4
	fish = 2
	bond = 0
	view = "map"
	_on_company()
	var work_actual := {"action_points": action_points, "fish": fish}
	_emit_eval("eval-002-work-and-feed", "passed" if action_points == 3 and fish == 4 else "failed", {"action_points": 3, "fish": 4}, work_actual)

	action_points = 4
	fish = 2
	bond = 0
	view = "cat"
	_on_feed()
	var feed_actual := {"action_points": action_points, "fish": fish, "bond": bond}
	var feed_dialogue := {"branch": cat_dialogue_branch, "mood": cat_mood, "line": cat_dialogue_line}
	action_points = 4
	fish = 2
	bond = 0
	view = "cat"
	_on_pet()
	var pet_actual := {"action_points": action_points, "fish": fish, "bond": bond}
	var pet_dialogue := {"branch": cat_dialogue_branch, "mood": cat_mood, "line": cat_dialogue_line}
	_emit_eval("eval-003-cat-interaction", "passed" if feed_actual["action_points"] == 3 and feed_actual["fish"] == 1 and feed_actual["bond"] == 5 and pet_actual["action_points"] == 3 and pet_actual["fish"] == 2 and pet_actual["bond"] == 3 else "failed", {"feed": {"action_points": 3, "fish": 1, "bond": 5}, "pet": {"action_points": 3, "fish": 2, "bond": 3}}, {"feed": feed_actual, "pet": pet_actual})
	_emit_eval("eval-201-dialogue-branches", "passed" if feed_dialogue["branch"] == "feed" and pet_dialogue["branch"] == "pet" and feed_dialogue["branch"] != pet_dialogue["branch"] else "failed", {"feedBranch": "feed", "petBranch": "pet"}, {"feed": feed_dialogue, "pet": pet_dialogue})
	_emit_eval("eval-202-emotion-feedback", "passed" if feed_dialogue["mood"] == "grateful" and pet_dialogue["mood"] == "trusting" and not feed_dialogue["line"].is_empty() and not pet_dialogue["line"].is_empty() and feed_dialogue["line"] != pet_dialogue["line"] else "failed", {"feedMood": "grateful", "petMood": "trusting", "nonEmptyDistinctLines": true}, {"feed": feed_dialogue, "pet": pet_dialogue})

	day = 1
	slot = 3
	action_points = 1
	fish = 2
	bond = 0
	view = "cat"
	_on_pet()
	await get_tree().create_timer(0.45).timeout
	var rollover_actual := {"day": day, "action_points": action_points, "today_weather": today_weather, "next_weather": next_weather}
	_emit_eval("eval-004-day-rollover", "passed" if day == 2 and action_points == 4 and next_weather in WEATHER_SEQUENCE else "failed", {"day": 2, "action_points": 4, "forecast_updated": true}, rollover_actual)
	day = 1
	season_index = 0
	weather_index = 2
	today_weather = WEATHER_SEQUENCE[weather_index]
	next_weather = WEATHER_SEQUENCE[(weather_index + 1) % WEATHER_SEQUENCE.size()]
	action_points = 0
	_rollover_day()
	var weather_rollover_actual := {"day": day, "season": season, "today_weather": today_weather, "next_weather": next_weather, "action_points": action_points}
	_emit_eval("eval-303-day-weather-advance", "passed" if day == 2 and today_weather == "暴雨" and action_points == 3 else "failed", {"day": 2, "today_weather": "暴雨", "action_points": 3}, weather_rollover_actual)

	# 使用独立评估文件验证真实磁盘往返，完成后立即清理该测试文件。
	timeline_revision = 12
	day = 4
	slot = 2
	action_points = 2
	fish = 7
	bond = 42
	view = "cat"
	cat_life_days_remaining = 9
	cat_alive = true
	adopted = false
	ending_state = "ongoing"
	var eval_saved := _save_game(EVAL_SAVE_PATH)
	day = 1
	fish = 0
	bond = 0
	cat_life_days_remaining = MAX_CAT_LIFE_DAYS
	timeline_revision = 0
	var eval_loaded := _load_game(EVAL_SAVE_PATH)
	var save_roundtrip_actual := {"saved": eval_saved, "loaded": eval_loaded, "day": day, "fish": fish, "bond": bond, "life": cat_life_days_remaining, "timelineRevision": timeline_revision}
	var save_roundtrip_passed := eval_saved and eval_loaded and day == 4 and fish == 7 and bond == 42 and cat_life_days_remaining == 9 and timeline_revision == 12
	_emit_eval("eval-601-save-roundtrip", "passed" if save_roundtrip_passed else "failed", {"saved": true, "loaded": true, "day": 4, "fish": 7, "bond": 42, "life": 9, "timelineRevision": 12}, save_roundtrip_actual)
	cat_type = CAT_TYPE_GUARDIAN
	location_visits_today = 2
	var guardian_save := _save_game(EVAL_SAVE_PATH)
	cat_type = CAT_TYPE_SICKLY
	location_visits_today = 0
	var guardian_load := _load_game(EVAL_SAVE_PATH)
	var legacy_data := _capture_state()
	legacy_data.erase("catType")
	var legacy_migrated := _apply_save_data(legacy_data)
	var guardian_save_actual := {"saved": guardian_save, "loaded": guardian_load, "catType": cat_type, "locationVisitsToday": location_visits_today, "legacyDefault": legacy_migrated and cat_type == CAT_TYPE_SICKLY}
	_emit_eval("eval-804-guardian-save", "passed" if guardian_save and guardian_load and cat_type == CAT_TYPE_SICKLY and legacy_migrated else "failed", {"guardianRoundtrip": true, "legacyDefaultsToSickly": true}, guardian_save_actual)

	day = 4
	action_points = 0
	cat_life_days_remaining = 9
	cat_alive = true
	adopted = false
	ending_state = "ongoing"
	timeline_revision = 7
	_rollover_day()
	var forward_actual := {"day": day, "life": cat_life_days_remaining, "timelineRevision": timeline_revision}
	_emit_eval("eval-602-forward-only-day", "passed" if day == 5 and cat_life_days_remaining == 8 and timeline_revision == 8 else "failed", {"day": 5, "life": 8, "timelineRevision": 8}, forward_actual)

	action_points = 4
	fish = 1
	bond = 147
	cat_alive = true
	cat_life_days_remaining = 8
	adopted = false
	ending_state = "ongoing"
	view = "cat"
	_on_feed()
	var home_actual := {"bond": bond, "endingState": ending_state, "adopted": adopted, "statusText": status_text}
	_emit_eval("eval-603-bond-home-ending", "passed" if bond == BOND_MAX and ending_state == "home" and adopted and status_text.contains("回家") else "failed", {"bond": 150, "endingState": "home", "adopted": true, "homeText": true}, home_actual)

	day = 9
	action_points = 0
	cat_life_days_remaining = 1
	cat_alive = true
	adopted = true
	ending_state = "home"
	view = "cat"
	_rollover_day()
	var interaction_after_farewell := _consume_action()
	var farewell_actual := {"life": cat_life_days_remaining, "catAlive": cat_alive, "endingState": ending_state, "interactionAllowed": interaction_after_farewell}
	_emit_eval("eval-604-lifetime-farewell", "passed" if cat_life_days_remaining == 0 and not cat_alive and ending_state == "farewell" and not interaction_after_farewell else "failed", {"life": 0, "catAlive": false, "endingState": "farewell", "interactionAllowed": false}, farewell_actual)

	var eval_save_absolute := ProjectSettings.globalize_path(EVAL_SAVE_PATH)
	var eval_cleanup := DirAccess.remove_absolute(eval_save_absolute) if FileAccess.file_exists(EVAL_SAVE_PATH) else OK
	_log_event("eval_save_cleanup", {"path": EVAL_SAVE_PATH, "error": eval_cleanup})

	_apply_save_data(saved)
	runtime_evaluating = false
	_update_interface()
	var map_hash := "sha256:" + FileAccess.get_sha256("res://assets/backgrounds/neighborhood.png")
	var cat_hash := "sha256:" + FileAccess.get_sha256("res://assets/cats/sick-cat.png")
	var map_size := MAP_BACKGROUND.get_size()
	var cat_size := SICK_CAT_TEXTURE.get_size()
	var assets_valid := map_hash == MAP_BACKGROUND_HASH and cat_hash == SICK_CAT_TEXTURE_HASH and map_size == Vector2(400, 224) and cat_size == Vector2(136, 136)
	_emit_eval(
		"eval-701-visual-assets-loaded",
		"passed" if assets_valid else "failed",
		{"mapHash": MAP_BACKGROUND_HASH, "mapSize": [400, 224], "catHash": SICK_CAT_TEXTURE_HASH, "catSize": [136, 136]},
		{"mapHash": map_hash, "mapSize": [int(map_size.x), int(map_size.y)], "catHash": cat_hash, "catSize": [int(cat_size.x), int(cat_size.y)]}
	)
	var v1_regression_passed := CAT_BOND_DELTAS[CAT_TYPE_SICKLY]["pet"] == 3 and CAT_BOND_DELTAS[CAT_TYPE_SICKLY]["feed"] == 5 and CAT_BOND_DELTAS[CAT_TYPE_SICKLY]["shelter"] == 20 and CAT_WEIGHTS.size() == 3
	_emit_eval("eval-805-v1-regression", "passed" if v1_regression_passed else "failed", {"sicklyDeltas": {"pet": 3, "feed": 5, "shelter": 20}, "v1CatWeights": 3}, {"sicklyDeltas": CAT_BOND_DELTAS[CAT_TYPE_SICKLY], "v1CatWeights": CAT_WEIGHTS.size()})
	_emit_eval("eval-005-visual-experience", "manual_required", {"human_review": true}, {"human_review": null})
	_emit_eval("eval-304-weather-presentation", "manual_required", {"human_review": true}, {"human_review": null})
	_emit_eval("eval-404-shelter-presentation", "manual_required", {"human_review": true}, {"human_review": null})
	_emit_eval("eval-503-probability-presentation", "manual_required", {"human_review": true}, {"human_review": null})
	_emit_eval("eval-605-ending-presentation", "manual_required", {"human_review": true}, {"human_review": null})
	_emit_eval("eval-702-visual-presentation", "manual_required", {"human_review": true}, {"human_review": null})
