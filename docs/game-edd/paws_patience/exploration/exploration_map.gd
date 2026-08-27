class_name ExplorationMap
extends Node2D

signal location_activated(location_id: String)
signal focus_changed(location_id: String, label: String, action_text: String)
signal player_position_changed(value: Vector2)

const MAP_SIZE := Vector2(400.0, 224.0)
const DEFAULT_SPAWN := Vector2(208.0, 154.0)
const LOCATION_ORDER := ["company", "alley", "street", "park"]
const LOCATION_DEFINITIONS := {
	"company": {"label": "公司", "action": "上班 · 获得 2 条小鱼干", "position": Vector2(145.0, 135.0), "radius": 16.0, "color": Color("f4c95d")},
	"alley": {"label": "巷尾", "action": "在巷尾寻找猫咪", "position": Vector2(38.0, 104.0), "radius": 15.0, "color": Color("f08a72")},
	"street": {"label": "街道", "action": "沿街道寻找猫咪", "position": Vector2(208.0, 184.0), "radius": 16.0, "color": Color("6fc7b2")},
	"park": {"label": "公园", "action": "去公园寻找猫咪", "position": Vector2(322.0, 92.0), "radius": 18.0, "color": Color("8ecb69")}
}

@onready var map_sprite: Sprite2D = $Map
@onready var player = $Player

var exploration_enabled := true
var focused_location_id := ""
var pulse_time := 0.0


func _ready() -> void:
	player.map_position_changed.connect(_on_player_position_changed)
	_build_location_labels()
	_refresh_focus()
	queue_redraw()


func _process(delta: float) -> void:
	pulse_time += delta
	if exploration_enabled:
		_refresh_focus()
	queue_redraw()


func _unhandled_input(event: InputEvent) -> void:
	if not exploration_enabled or focused_location_id.is_empty():
		return
	var activate := event.is_action_pressed("ui_accept")
	if event is InputEventKey:
		activate = activate or (event.pressed and not event.echo and event.physical_keycode == KEY_E)
	if activate:
		location_activated.emit(focused_location_id)
		get_viewport().set_input_as_handled()


func fit_to_viewport(viewport_size: Vector2) -> void:
	if viewport_size.x <= 0.0 or viewport_size.y <= 0.0:
		return
	var fit_scale := maxf(viewport_size.x / MAP_SIZE.x, viewport_size.y / MAP_SIZE.y)
	scale = Vector2.ONE * fit_scale
	position = (viewport_size - MAP_SIZE * fit_scale) * 0.5


func set_exploration_enabled(value: bool) -> void:
	exploration_enabled = value
	player.set_movement_enabled(value)
	if not value and not focused_location_id.is_empty():
		focused_location_id = ""
		focus_changed.emit("", "", "")


func set_player_position(value: Vector2) -> void:
	player.set_map_position(value)
	_refresh_focus()


func get_player_position() -> Vector2:
	return player.position


func get_default_spawn() -> Vector2:
	return DEFAULT_SPAWN


func get_location_ids() -> Array[String]:
	var ids: Array[String] = []
	for location_id in LOCATION_ORDER:
		ids.append(location_id)
	return ids


func location_id_at_position(value: Vector2) -> String:
	var nearest_id := ""
	var nearest_distance := INF
	for location_id in LOCATION_ORDER:
		var definition: Dictionary = LOCATION_DEFINITIONS[location_id]
		var distance := value.distance_to(definition["position"])
		if distance <= float(definition["radius"]) and distance < nearest_distance:
			nearest_id = location_id
			nearest_distance = distance
	return nearest_id


func get_location_position(location_id: String) -> Vector2:
	if not LOCATION_DEFINITIONS.has(location_id):
		return DEFAULT_SPAWN
	return LOCATION_DEFINITIONS[location_id]["position"]


func get_map_texture_size() -> Vector2:
	return map_sprite.texture.get_size() if map_sprite.texture != null else Vector2.ZERO


func has_player() -> bool:
	return is_instance_valid(player)


func _refresh_focus() -> void:
	var next_id := location_id_at_position(player.position)
	if next_id == focused_location_id:
		return
	focused_location_id = next_id
	if next_id.is_empty():
		focus_changed.emit("", "", "")
	else:
		var definition: Dictionary = LOCATION_DEFINITIONS[next_id]
		focus_changed.emit(next_id, definition["label"], definition["action"])


func _on_player_position_changed(value: Vector2) -> void:
	player_position_changed.emit(value)
	_refresh_focus()


func _build_location_labels() -> void:
	for location_id in LOCATION_ORDER:
		var definition: Dictionary = LOCATION_DEFINITIONS[location_id]
		var label := Label.new()
		label.text = definition["label"]
		label.position = definition["position"] + Vector2(-13.0, -17.0)
		label.custom_minimum_size = Vector2(26.0, 8.0)
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.add_theme_font_size_override("font_size", 6)
		label.add_theme_color_override("font_color", Color.WHITE)
		label.add_theme_color_override("font_outline_color", Color(0.02, 0.05, 0.06, 0.9))
		label.add_theme_constant_override("outline_size", 2)
		label.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(label)


func _draw() -> void:
	for location_id in LOCATION_ORDER:
		var definition: Dictionary = LOCATION_DEFINITIONS[location_id]
		var center: Vector2 = definition["position"]
		var color: Color = definition["color"]
		var is_focused: bool = str(location_id) == focused_location_id
		var radius: float = 7.0 + (sin(pulse_time * 4.0) + 1.0) * 0.8 if is_focused else 6.0
		draw_circle(center, radius, Color(color, 0.2 if is_focused else 0.12))
		draw_arc(center, radius, 0.0, TAU, 24, Color(color, 0.95), 1.25)
		draw_circle(center, 1.8, color)
